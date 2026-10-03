var Nu='600 34px "Helvetica Neue", Arial, sans-serif';function hr(i,t,e,n,s,r){i.beginPath(),i.roundRect(t,e,n,s,r)}var Uu={id:"paper",name:"Paper",size:{w:280,h:468},thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{body:{color:15196109,metalness:0,roughness:.9},face:{metalness:0,roughness:.85,clearcoat:.15},back:{metalness:0,roughness:.9}},async face(i,{loadImage:t}){let s=document.createElement("canvas");s.width=560,s.height=936;let r=s.getContext("2d");hr(r,0,0,560,936,28),r.fillStyle="#f3ecdc",r.fill(),r.lineWidth=6,r.strokeStyle="#3b3226",hr(r,6,6,548,924,24),r.stroke();let a=36,o=36,l=488,c=Math.round(l*1.5);r.save(),hr(r,a,o,l,c,14),r.clip(),r.fillStyle="#cfc6b0",r.fillRect(a,o,l,c);let h=i.portrait?await t(i.portrait):null;if(h){let u=Math.max(l/h.width,c/h.height);r.drawImage(h,a+(l-h.width*u)/2,o+(c-h.height*u)*.15,h.width*u,h.height*u)}else r.fillStyle="#3b3226",r.font=`700 ${Math.round(l*.5)}px sans-serif`,r.textAlign="center",r.textBaseline="middle",r.fillText((i.name??"?").slice(0,1).toUpperCase(),a+l/2,o+c/2);r.restore(),i.colour&&(r.fillStyle=i.colour,r.fillRect(a,o+c+14,l,8));let d=o+c+34;return r.fillStyle="#3b3226",r.font=Nu,r.textAlign="center",r.textBaseline="middle",r.fillText((i.name??i.id).toUpperCase(),560/2,d+(936-d-36)/2),s},async back(i){let n=document.createElement("canvas");n.width=560,n.height=936;let s=n.getContext("2d");return hr(s,0,0,560,936,28),s.fillStyle="#b9966a",s.fill(),s.fillStyle="#f3ecdc",hr(s,560/2-190,936/2-44,380,88,6),s.fill(),s.fillStyle="#3b3226",s.font=Nu,s.textAlign="center",s.textBaseline="middle",s.fillText(i.name??i.id,560/2,936/2+2),n}};var Sm=["id","size","face","back"],Pa=class{constructor(){this.skins=new Map,this.register(Uu),this.current="paper"}register(t){for(let e of Sm)if(!t?.[e])throw new Error(`a skin needs "${e}"`);if(typeof t.face!="function"||typeof t.back!="function")throw new Error("a skin's face and back are functions");if(!(t.size?.w>0&&t.size?.h>0))throw new Error("a skin's size is { w, h } in pixels");return this.skins.set(t.id,{thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{},...t}),t.id}get(t){return this.skins.get(t)??this.skins.get(this.current)??this.skins.get("paper")}use(t){if(!this.skins.has(t))throw new Error(`no skin "${t}" is registered`);this.current=t}list(){return[...this.skins.keys()]}};var ur=Object.freeze(["off","zones","anywhere"]),Ou=Object.freeze(["door","spot","area","exit","track","chalk","podium","photo","quiet","music","shelter","shot","trigger"]),ns=i=>typeof i=="number"&&Number.isFinite(i),Fu=(i,t=-.25,e=1.25)=>ns(i)&&i>=t&&i<=e,es=i=>Array.isArray(i)&&i.length===2&&Fu(i[0])&&Fu(i[1]),Me=(i,t)=>ns(i)?i:t,He=(i,t="")=>typeof i=="string"?i:t;function Lc(i,t,e,n=0){if(!Array.isArray(i))return e.push(`${t}: expected a list of [x, y] points`),[];let s=[];return i.forEach((r,a)=>es(r)?s.push([r[0],r[1]]):e.push(`${t}[${a}]: not a point on the painting`)),s.length<n&&e.push(`${t}: needs at least ${n} points`),s}function ku(i,t,e){let n=new Set;return i.filter(s=>s.id?n.has(s.id)?(e.push(`${t}: id "${s.id}" is used twice`),!1):(n.add(s.id),!0):(e.push(`${t}: an entry has no id`),!1))}function Ia(i){let t=[],e=i&&typeof i=="object"?i:{};(!i||typeof i!="object")&&t.push("the scene carries no stage description");let n={src:He(e.painting?.src),size:Array.isArray(e.painting?.size)&&e.painting.size.length===2&&e.painting.size.every(g=>ns(g)&&g>0)?[e.painting.size[0],e.painting.size[1]]:null};n.src||t.push("painting.src: the stage needs a painting"),n.size||t.push("painting.size: give the painting's size in pixels, [width, height]");let s={horizon:Me(e.rig?.horizon,null),floorFront:Me(e.rig?.floorFront,null),depth:Me(e.rig?.depth,null),vanish:Me(e.rig?.vanish,.5),lift:Me(e.rig?.lift,0)};for(let g of["horizon","floorFront","depth"])s[g]===null&&t.push(`rig.${g}: the rig needs a number here`);s.horizon!==null&&s.floorFront!==null&&s.floorFront<=s.horizon&&t.push("rig: the floor must meet the front of the picture below the horizon"),s.depth!==null&&s.depth<=0&&t.push("rig.depth: must be above zero");let r=(Array.isArray(e.lights)?e.lights:[]).flatMap((g,m)=>{if(!es(g?.at))return t.push(`lights[${m}].at: not a point on the painting`),[];let p=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(ns)?g.colour.map(b=>Math.max(0,Math.min(255,b))):[255,172,96];return[{id:He(g.id,`light-${m+1}`),at:[g.at[0],g.at[1]],below:Me(g.below,.9),colour:p,intensity:Math.max(0,Me(g.intensity,1)),flicker:Math.max(0,Math.min(.5,Me(g.flicker,.05))),flickerHz:Math.max(.5,Me(g.flickerHz,7)),pool:ns(g.pool)&&g.pool>0?g.pool:0,shadow:g.shadow===!0}]}),a=(Array.isArray(e.occluders)?e.occluders:[]).flatMap((g,m)=>{let p=Lc(g?.poly,`occluders[${m}].poly`,t,3);return p.length<3?[]:[{id:He(g.id,`occluder-${m+1}`),poly:p,base:Me(g.base,.86),x:Me(g.x,.5),riser:g.riser!==!1,hideAtMost:Math.max(.1,Math.min(1,Me(g.hideAtMost,.45)))}]}),o=(Array.isArray(e.zones)?e.zones:[]).flatMap((g,m)=>{let p=Lc(g?.shape,`zones[${m}].shape`,t,3);if(p.length<3)return[];let b=g.floor===void 0?null:Lc(g.floor,`zones[${m}].floor`,t,3),C=Array.isArray(g.tags)?g.tags.filter(S=>typeof S=="string"&&S.trim()).map(S=>S.trim()):[],M=Array.isArray(g.near)?g.near.filter(S=>typeof S=="string"):[],w=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(ns)?g.colour.map(S=>Math.max(0,Math.min(255,S))):null;return[{id:He(g.id),kind:He(g.kind,"trigger")||"trigger",name:He(g.name),hint:He(g.hint),shape:p,floor:b&&b.length>=3?b:null,quiet:g.quiet===!0,gate:["open","ask","locked","hidden"].includes(g.gate)?g.gate:"open",to:He(g.to),tags:C,near:M,colour:w}]}),l=ku(o,"zones",t);for(let g of l)for(let m of g.near)l.some(p=>p.id===m)||t.push(`zones: "${g.id}" is near "${m}", which is not in this scene`);let c=(Array.isArray(e.marks)?e.marks:[]).flatMap((g,m)=>{if(!es(g?.at))return t.push(`marks[${m}].at: not a point on the painting`),[];let p=g.faces&&typeof g.faces=="object"?es(g.faces.point)?{point:[g.faces.point[0],g.faces.point[1]]}:He(g.faces.zone)?{zone:He(g.faces.zone)}:He(g.faces.card)?{card:He(g.faces.card)}:null:null;return[{id:He(g.id),at:[g.at[0],g.at[1]],yaw:Me(g.yaw,0),lean:Me(g.lean,0),pitch:Me(g.pitch,0),lift:Math.max(0,Me(g.lift,0)),capacity:Math.max(1,Math.round(Me(g.capacity,1))),label:He(g.label),group:He(g.group),zone:He(g.zone),faces:p}]}),h=ku(c,"marks",t);for(let g of h)g.zone&&!l.some(m=>m.id===g.zone)&&t.push(`marks: "${g.id}" belongs to zone "${g.zone}", which is not in this scene`);for(let g of h)g.faces?.zone&&!l.some(m=>m.id===g.faces.zone)&&t.push(`marks: "${g.id}" faces zone "${g.faces.zone}", which is not in this scene`);let d=ur.includes(e.chalk?.mode)?e.chalk.mode:"off";e.chalk?.mode!==void 0&&!ur.includes(e.chalk.mode)&&t.push(`chalk.mode: "${e.chalk.mode}" is not one of ${ur.join(", ")}`);let u={mode:d,lock:e.chalk?.lock===!0,weather:e.chalk?.weather===!0,box:es(e.chalk?.box)?[e.chalk.box[0],e.chalk.box[1]]:null};u.mode==="zones"&&!l.some(g=>g.kind==="chalk")&&t.push("chalk: the mode is zones but the scene has no zone of kind chalk");let f={version:1,painting:n,rig:s,skin:He(e.skin),cardScale:Math.max(.2,Math.min(2,Me(e.cardScale,.7))),ambient:Math.max(0,Me(e.ambient,1.7)),lights:r,occluders:a,zones:l,marks:h,chalk:u,marksOnly:e.marksOnly===!0,footlights:e.footlights===!0,focus:es(e.focus)?[e.focus[0],e.focus[1]]:null,board:e.board===!0,reach:{snap:Math.max(40,Me(e.reach?.snap,170)),show:Math.max(200,Me(e.reach?.show,700))}},x=!!(n.src&&n.size&&s.horizon!==null&&s.floorFront!==null&&s.depth!==null);return{ok:t.length===0,usable:x,scene:f,problems:t}}var st="stagecraft",dr=i=>i?.flags?.[st]?.stage??null,is=i=>!!dr(i)&&typeof dr(i)=="object",La=i=>Array.isArray(i?.flags?.[st]?.published?.cards)?i.flags[st].published.cards:[];function ss(i){let t=Ia(dr(i));return t.usable&&t.scene.painting.src&&globalThis.foundry?.utils?.getRoute&&(t.scene.painting.src=foundry.utils.getRoute(t.scene.painting.src)),t}function fr(i){let t=globalThis.foundry?.utils?.getRoute??(e=>e);return La(i).filter(e=>e&&typeof e.id=="string").map(e=>({...e,portrait:e.portrait?t(e.portrait):e.portrait}))}function rs(){if(!game.user?.isGM)return!1;let i=game.users?.activeGM;return i?i.id===game.user.id:!0}var as=i=>i?.flags?.[st]?.live?.handsOff===!0;function Bu(i,t,{handsOff:e=!1}={}){return t?.isGM?!0:e?!1:!Array.isArray(i?.owners)||i.owners.length===0?!0:i.owners.includes(t?.id)}function zu(){let i=foundry.data.fields;game.settings.register(st,"tier",{name:"STAGECRAFT.Settings.Tier.Name",hint:"STAGECRAFT.Settings.Tier.Hint",scope:"client",config:!0,requiresReload:!1,type:new i.StringField({required:!0,blank:!1,initial:"auto",choices:{auto:"STAGECRAFT.Settings.Tier.Auto",high:"STAGECRAFT.Settings.Tier.High",low:"STAGECRAFT.Settings.Tier.Low",flat:"STAGECRAFT.Settings.Tier.Flat"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","tier")}),game.settings.register(st,"zones",{name:"STAGECRAFT.Settings.Zones.Name",hint:"STAGECRAFT.Settings.Zones.Hint",scope:"client",config:!0,type:new i.StringField({required:!0,blank:!1,initial:"faint",choices:{faint:"STAGECRAFT.Settings.Zones.Faint",off:"STAGECRAFT.Settings.Zones.Off",full:"STAGECRAFT.Settings.Zones.Full"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","zones")}),game.settings.register(st,"calm",{name:"STAGECRAFT.Settings.Calm.Name",hint:"STAGECRAFT.Settings.Calm.Hint",scope:"client",config:!0,type:new i.BooleanField({initial:!1}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","calm")})}var Hu=()=>game.settings.get(st,"tier");function Dc(){let i=game.settings.get(st,"tier");if(i==="high"||i==="low"||i==="flat")return i;let t=game.settings.get("core","performanceMode");return t!==null&&t<=CONST.CANVAS_PERFORMANCE_MODES.LOW?"low":"high"}function Da(){return game.settings.get(st,"calm")||game.settings.get("core","photosensitiveMode")?!0:!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}var Na=()=>game.settings.get(st,"zones");var Gu=(i,t,e)=>Math.max(t,Math.min(e,i)),wm=(i,t,e)=>i+(t-i)*e,Nc=Math.PI/180;function Wu(i){let t=i>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function pr(i,t=0){let e=Math.floor(i),n=i-e,s=a=>{let o=Math.imul(a+t*7919|0,668265261);return o^=o>>>15,o=Math.imul(o,2246822507),o^=o>>>13,(o>>>0)/4294967296*2-1},r=n*n*(3-2*n);return wm(s(e),s(e+1),r)}function Xu(i,t,e,n,s=.5,r=0,a=.5){let o=Math.max(e/i,n/t),l=(e-i*o)*a,c=(n-t*o)*s-r;return{s:o,ox:l,oy:c,lift:r,x:h=>l+h*i*o,y:h=>c+h*t*o}}function Zu(i,t,e){return{f:i.depth*e,cx:t.x(i.vanish??.5),cy:t.y(i.horizon),floorY:t.y(i.floorFront),map:t}}function Uc(i,t,e,n){let s=i.f/(i.f-n);return{sx:i.cx+(t-i.cx)*s,sy:i.cy+(e-i.cy)*s,k:s}}function Tm(i,t,e){let n=(e-i.cy)/(i.floorY-i.cy);if(n<=0)return null;let s=i.f-i.f/n;return{x:i.cx+(t-i.cx)/n,z:s}}function qu(i,t,e){return Tm(i,i.map.x(t),i.map.y(e))}function sn(i,t,e,n){return Math.atan2(e-i,n-t)/Nc}function rn(i,{share:t=.62,max:e=52}={}){let n=(i+540)%360-180;return Math.abs(n)>90&&(n=Math.sign(n)*(180-Math.abs(n))*.5+Math.sign(n)*35),Gu(n*t,-e,e)}function $u(i,t,e,{open:n=110,start:s=0}={}){let r=[],a=360-n;for(let o=0;o<e;o++){let l=e===1?.5:o/(e-1),h=(180+s-a/2+l*a)*Nc,d=i.x+Math.sin(h)*t,u=i.z+Math.cos(h)*t*.9;r.push({x:d,z:u,yaw:rn(sn(d,u,i.x,i.z),{share:.7,max:58})})}return r}function Yu(i,t,{r:e=95,lean:n=9,pitch:s=7}={}){let r=[];for(let a=0;a<t;a++){let l=(t===1?180:110+140*a/(t-1))*Nc,c=i.x+Math.sin(l)*e,h=i.z+Math.cos(l)*e*.55,d=Math.sign(i.x-c)||1;r.push({x:c,z:h,yaw:rn(sn(c,h,i.x,i.z),{share:.8,max:50}),lean:d*n,pitch:s})}return r}function Ju(i,t,e,{gap:n=380,spread:s=150,depthStep:r=60}={}){let a=[];return t.forEach((o,l)=>{let c=i.x-n/2-l*s*.7,h=i.z-l*r;a.push({x:c,z:h,yaw:rn(sn(c,h,i.x+n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),e.forEach((o,l)=>{let c=i.x+n/2+l*s*.7,h=i.z-l*r;a.push({x:c,z:h,yaw:rn(sn(c,h,i.x-n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),a}var Vu=Object.freeze({calm:{breathe:.006,breatheHz:.22,sway:.5,swayHz:.09,fidget:0,pitch:0,lean:0,glance:.7},nervous:{breathe:.01,breatheHz:.45,sway:1.1,swayHz:.6,fidget:.25,pitch:2,lean:0,glance:1.2,jitter:.6},proud:{breathe:.007,breatheHz:.18,sway:.3,swayHz:.07,fidget:0,pitch:-4,lean:0,glance:.4},slouch:{breathe:.008,breatheHz:.15,sway:.9,swayHz:.06,fidget:.05,pitch:3,lean:4,glance:.3},bouncy:{breathe:.009,breatheHz:.5,sway:.8,swayHz:.35,fidget:.4,pitch:0,lean:0,glance:1,hop:6},sly:{breathe:.006,breatheHz:.2,sway:.6,swayHz:.12,fidget:.1,pitch:4,lean:-3,glance:1.4}});function Ku(i,t,e="calm",{speakerYaw:n=null}={}){let s=Vu[e]??Vu.calm,r=t%1e3/1e3,a=1+s.breathe*Math.sin(2*Math.PI*(i*s.breatheHz+r)),o=s.lean+s.sway*pr(i*s.swayHz*4+r*10,t),l=0;if(s.jitter&&(o+=s.jitter*pr(i*9+r*31,t+3)*.6),s.fidget){let h=Math.floor(i*s.fidget+r*7),d=i*s.fidget+r*7-h,u=Math.abs(pr(h*1.7,t+11));if(u>.55&&d<.18){let f=Math.sin(d/.18*Math.PI);l+=(s.hop??3)*f,o+=2.5*f*(u>.8?1:-1)}}let c=n===null?0:Gu(n,-1,1)*6*s.glance;return{breathe:a,lean:o,pitch:s.pitch,lift:l,yaw:c}}var rM=Object.freeze({dust:{rate:26,life:[5,9],size:[1.2,2.8],vy:[-6,6],vx:[-8,8],vz:[-6,6],gravity:0,drag:.4,glow:!0},smoke:{rate:5,life:[5,8],size:[26,46],vy:[-26,-14],vx:[-6,6],vz:[-4,4],gravity:0,drag:.2,grow:9,soft:!0},steam:{rate:9,life:[3.5,6],size:[30,56],vy:[-34,-18],vx:[-8,8],vz:[-6,6],gravity:0,drag:.2,grow:14,soft:!0},sparks:{rate:60,life:[.5,1.1],size:[1.6,3],vy:[-260,-90],vx:[-140,140],vz:[-60,60],gravity:520,drag:.1,glow:!0,bounce:.35,streak:!0},petals:{rate:3,life:[9,14],size:[5,8],vy:[10,22],vx:[-22,4],vz:[-6,6],gravity:0,drag:.1,settle:!0,spin:!0},snow:{rate:30,life:[18,26],size:[1.6,3.6],vy:[50,80],vx:[-10,10],vz:[-10,10],gravity:0,drag:.1,settle:!0},rain:{rate:240,life:[.9,1.3],size:[1,1.6],vy:[900,1200],vx:[-90,-60],vz:[0,0],gravity:0,drag:0,streak:!0,splash:!0}});var ju=(i,t,e)=>Math.max(t,Math.min(e,i)),Fc=Object.freeze({follow:42,stiffness:150,damping:9,lag:.5,maxLean:15,jostleK:110,jostleC:11,bumpSpin:.009,bonkSpeed:120,shove:.35,maxJolt:70,growK:220,growC:22,parked:.5,held:1,hopTime:.42,hopHeight:74,nodTime:.34,bowTime:.95,shakeTime:.62});function Qu({id:i,x:t,y:e,scale:n=1,home:s="stage",owner:r=null,rod:a=112,w:o=230,h:l=393}){return{id:i,owner:r,home:s,rod:a,w:o,h:l,x:t,y:e,vx:0,vy:0,ax:0,restX:t,restY:e,lean:0,leanV:0,jx:0,jv:0,scale:n,scaleV:0,scaleTo:n,turn:0,turnV:0,turnTo:0,heldBy:null,target:null,verbs:[]}}var Em=Object.freeze(["hop","nod","bow","shake","turn"]);function td(i,t){return t==="turn"?(i.turnTo=i.turnTo?0:180,i):(Em.includes(t)&&i.verbs.push({verb:t,t:0}),i)}function ed(i,t,e=Fc){let n=i.target?i.target.x:i.restX,s=i.target?i.target.y:i.restY,r=e.follow,a=r*r*(n-i.x)-2*r*i.vx,o=r*r*(s-i.y)-2*r*i.vy;i.vx+=a*t,i.vy+=o*t,i.x+=i.vx*t,i.y+=i.vy*t,i.ax=a;let l=-e.stiffness*i.lean-e.damping*i.leanV-e.lag*e.stiffness/1e3*a;i.leanV+=l*t,i.lean+=i.leanV*t,i.lean=ju(i.lean,-e.maxLean*1.6,e.maxLean*1.6);let c=-e.jostleK*i.jx-e.jostleC*i.jv;i.jv+=c*t,i.jx+=i.jv*t;let h=e.growK*(i.scaleTo-i.scale)-e.growC*i.scaleV;i.scaleV+=h*t,i.scale+=i.scaleV*t;let d=160*(i.turnTo-i.turn)-18*i.turnV;i.turnV+=d*t,i.turn+=i.turnV*t;for(let u of i.verbs)u.t+=t;return i.verbs=i.verbs.filter(u=>u.t<nd(u.verb,e)),i}function nd(i,t){return i==="hop"?t.hopTime:i==="nod"?t.nodTime:i==="bow"?t.bowTime:t.shakeTime}function id(i,t=Fc){let e=0,n=1,s=0,r=0,a=0;for(let o of i.verbs){let l=o.t/nd(o.verb,t);o.verb==="hop"?(e+=4*t.hopHeight*l*(1-l),l<.12&&(n*=1-.1*Math.sin(l/.12*Math.PI)),l>.86&&(n*=1-.12*Math.sin((l-.86)/.14*Math.PI))):o.verb==="nod"?(a+=12*Math.sin(l*Math.PI),n*=1-.04*Math.sin(l*Math.PI)):o.verb==="bow"?s+=34*Math.sin(Math.min(1,l*1.6)*Math.PI*.5)*(l<.62?1:Math.max(0,(1-l)/.38)):o.verb==="shake"&&(r+=18*Math.exp(-3.2*l)*Math.sin(l*4*2*Math.PI))}return{lift:e,squash:n,tipX:s,shakeY:r,dip:a}}function mr(i){let t=i.scale,e=i.x+i.jx-i.w*t/2,n=i.y-i.rod*t;return{left:e,right:e+i.w*t,top:n-i.h*t,bottom:n}}function sd(i,t=new Set,e=Fc){let n=[],s=new Set,r=a=>ju(a,-e.maxJolt,e.maxJolt);for(let a=0;a<i.length;a++)for(let o=a+1;o<i.length;o++){let l=i[a],c=i[o];if(!l.heldBy&&!c.heldBy||l.home==="wings"||c.home==="wings")continue;let h=mr(l),d=mr(c),u=Math.min(h.right,d.right)-Math.max(h.left,d.left),f=Math.min(h.bottom,d.bottom)-Math.max(h.top,d.top);if(u<=0||f<=0)continue;let x=(h.left+h.right)/2<(d.left+d.right)/2?1:-1,g=l.heldBy&&!c.heldBy?.15:!l.heldBy&&c.heldBy?.85:.5,m=1-g,p=`${l.id}|${c.id}`;if(s.add(p),l.heldBy&&c.heldBy&&(l.jx=r(l.jx-x*u*e.shove),c.jx=r(c.jx+x*u*e.shove)),t.has(p))continue;let b=Math.abs(l.vx-c.vx);b<e.bonkSpeed||(l.jv-=x*b*.3*g,c.jv+=x*b*.3*m,l.leanV-=x*b*e.bumpSpin*6,c.leanV+=x*b*e.bumpSpin*14*m,n.push({a:l.id,b:c.id,x:x>0?h.right-u/2:h.left+u/2,y:Math.max(h.top,d.top)+f*.3,speed:b}))}for(let a of i)a.jx=r(a.jx);t.clear();for(let a of s)t.add(a);return n}function rd(i,t,e,n,s=33){return i?n-i.t<s?!1:Math.abs(t-i.x)+Math.abs(e-i.y)>.75:!0}var Ua=class{constructor({delay:t=100,max:e=32}={}){this.delay=t,this.max=e,this.samples=[]}push(t){this.samples.push(t),this.samples.sort((e,n)=>e.t-n.t),this.samples.length>this.max&&this.samples.shift()}at(t){let e=this.samples;if(!e.length)return null;let n=t-this.delay;if(n<=e[0].t)return{x:e[0].x,y:e[0].y};for(let l=1;l<e.length;l++)if(e[l].t>=n){let c=e[l-1],h=e[l],d=(n-c.t)/Math.max(1,h.t-c.t);return{x:c.x+(h.x-c.x)*d,y:c.y+(h.y-c.y)*d}}let s=e[e.length-1],r=e[e.length-2]??s,a=Math.min(n-s.t,80),o=Math.max(1,s.t-r.t);return{x:s.x+(s.x-r.x)/o*a,y:s.y+(s.y-r.y)/o*a}}};function ad(i,t){return i?t?i.t!==t.t?i.t<t.t?i:t:i.user<t.user?i:t:i:t}var Fa=Object.freeze({W:2560,H:1440});function os(i,t,e=Fa){let[n,s]=i.size,r=Xu(n,s,e.W,e.H,.5,t.lift??0,.5),a=Zu(t,r,e.W),o=(l,c)=>[(l-r.ox)/(n*r.s),(c-r.oy)/(s*r.s)];return{ref:e,map:r,cam:a,size:[n,s],standing(l){let c=qu(a,l[0],l[1]);return c?{X:c.x-a.cx,Z:c.z}:null},fractionOf(l,c){let h=Uc(a,l+a.cx,a.floorY,c);return o(h.sx,h.sy)},screenOf(l,c,h){let d=Uc(a,l+a.cx,a.floorY-c,h);return{x:d.sx,y:d.sy,k:d.k}},fractionOfScreen:o}}function gr(i,t,e=Fa){let n=Math.max(i/e.W,t/e.H),s=i/n,r=t/n;return{vw:i,vh:t,s:n,ox:(e.W-s)/2,oy:(e.H-r)/2,visW:s,visH:r}}var xr=Object.freeze({rest:"rest",near:"near",target:"target"}),od=Object.freeze({faint:.2,off:0,full:1});function ls(i,t,e){let n=!1;for(let s=0,r=i.length-1;s<i.length;r=s++){let[a,o]=i[s],[l,c]=i[r];o>e!=c>e&&t<(l-a)*(e-o)/(c-o)+a&&(n=!n)}return n}function kc(i,t,e){let n=1/0;for(let s=0,r=i.length-1;s<i.length;r=s++){let[a,o]=i[r],[l,c]=i[s],h=l-a,d=c-o,u=h*h+d*d,f=u===0?0:Math.max(0,Math.min(1,((t-a)*h+(e-o)*d)/u));n=Math.min(n,Math.hypot(t-(a+f*h),e-(o+f*d)))}return n}function ld(i){let t=0,e=0;for(let[n,s]of i)t+=n,e+=s;return[t/i.length,e/i.length]}var ka=i=>i.floor&&i.floor.length>=3?i.floor:i.shape;function cd(i,t,e){return i.filter(n=>ls(ka(n),t,e))}function hd(i,t,e=.1){let n={};for(let s of i){let r=xr.rest,a=ka(s);for(let o of t){if(ls(a,o.x,o.y)){r=xr.target;break}kc(a,o.x,o.y)<=e&&(r=xr.near)}n[s.id]=r}return n}function Oc(i,t,e="faint"){return t===xr.target?1:t===xr.near?.85:i.quiet?0:od[e]??od.faint}function Am(i,t){let e=ka(i),n=ka(t);if(e.some(([r,a])=>ls(n,r,a))||n.some(([r,a])=>ls(e,r,a)))return 0;let s=1/0;for(let[r,a]of e)s=Math.min(s,kc(n,r,a));for(let[r,a]of n)s=Math.min(s,kc(e,r,a));return s}function ud(i,{touch:t=.035}={}){let e=i.filter(o=>o.kind==="area"),n=new Set(e.map(o=>o.id)),s=new Map,r=(o,l)=>{if(o===l||!n.has(o)||!n.has(l))return;let[c,h]=o<l?[o,l]:[l,o];s.set(`${c}|${h}`,{a:c,b:h})};if(e.some(o=>Array.isArray(o.near)&&o.near.length))for(let o of e)for(let l of o.near??[])r(o.id,l);else for(let o=0;o<e.length;o++)for(let l=o+1;l<e.length;l++)Am(e[o],e[l])<=t&&r(e[o].id,e[l].id);return[...s.values()].sort((o,l)=>o.a+o.b<l.a+l.b?-1:1)}function dd(i,t){let e=[];for(let[n,s]of t){let r=i.get(n)??new Set;for(let a of s)r.has(a)||e.push({type:"zone",card:n,zone:a,entered:!0})}for(let[n,s]of i){let r=t.get(n)??new Set;for(let a of s)r.has(a)||e.push({type:"zone",card:n,zone:a,entered:!1})}return e}function fd(i,t){let e=[],n=[];for(let s of i){let r=t.standing(s.at);if(!r){n.push(s.id);continue}e.push({...s,X:r.X,Z:r.Z})}return{marks:e,dropped:n}}function pd(i,t){return i.filter(e=>(t.get(e.id)?.size??0)<e.capacity)}function Bc(i,t,e){return Math.hypot(i-e.X,(t-e.Z)*.75)}function zc(i,t,e,n,s){let r=null,a=1/0;for(let o of pd(i,t)){let l=Bc(e,n,o);l<a&&l<=s&&(r=o,a=l)}return r}function md(i,t,e,n,{show:s=700,snap:r=170,max:a=5}={}){let o=pd(i,t).map(c=>({mark:c,d:Bc(e,n,c)})).filter(c=>c.d<=s).sort((c,h)=>c.d-h.d).slice(0,a),l=o.length&&o[0].d<=r?o[0].mark.id:null;return o.map(c=>{let h=1-Math.min(1,Math.max(0,(c.d-r)/(s-r))),d=c.mark.id===l?1:.18+.5*h*h;return{id:c.mark.id,mark:c.mark,distance:c.d,alpha:d,target:c.mark.id===l}})}function Oa(i,t={}){let e=i.yaw,n=i.faces;if(n){let s=null;if(n.point&&t.pointOnFloor)s=t.pointOnFloor(n.point);else if(n.zone&&t.zones&&t.pointOnFloor){let r=t.zones.find(a=>a.id===n.zone);r&&(s=t.pointOnFloor(ld(r.shape)))}else n.card&&t.cardAt&&(s=t.cardAt(n.card));s&&(e=rn(sn(i.X,i.Z,s.X,s.Z)))}return{yaw:e,lean:i.lean,pitch:i.pitch,lift:i.lift}}function Ba(i,t){let e=new Map,n=[],s=new Set(t.map(a=>a.id)),r=new Map(t.map(a=>[a.id,a]));for(;;){let a=null;for(let o of s){let l=r.get(o);for(let c of i){if((e.get(c.id)??0)>=c.capacity)continue;let h=Bc(l.X,l.Z,c);(!a||h<a.d)&&(a={d:h,c:l,m:c})}}if(!a)break;e.set(a.m.id,(e.get(a.m.id)??0)+1),s.delete(a.c.id),n.push({card:a.c.id,mark:a.m.id})}return n}var gd=(i,t,e)=>Math.max(t,Math.min(e,i)),Li=Object.freeze({walk:{speed:520,stride:110,height:12,rock:3.5,turn:.7},stroll:{speed:300,stride:90,height:8,rock:2.6,turn:.6},hurry:{speed:880,stride:135,height:15,rock:5,turn:.8},march:{speed:600,stride:120,height:10,rock:1.2,turn:.5},sneak:{speed:230,stride:70,height:4,rock:1.5,turn:.75},scurry:{speed:1150,stride:42,height:5,rock:7,turn:.9},hop:{speed:640,stride:170,height:48,rock:2,turn:.6},glide:{speed:380,stride:0,height:0,rock:0,turn:.4}}),xd=Object.freeze(Object.keys(Li)),za=(i,t)=>Math.hypot(t.X-i.X,(t.Z-i.Z)*.8);function Di(i,t,{t0:e=0,gait:n="walk",yaw:s=null,pace:r=1,minDur:a=.3,maxDur:o=6}={}){let l=Li[n]?n:"walk",c=Li[l],h=za(i,t),d=gd(h/(c.speed*Math.max(.1,r)),a,o),u=c.stride>0&&h>c.stride*.6?Math.max(1,Math.round(h/c.stride)):0;return{from:{X:i.X,Z:i.Z},to:{X:t.X,Z:t.Z},t0:e,dur:d,gait:l,steps:u,yaw:s??null,dist:h}}function Cm(i){if(i<=0)return 0;if(i>=1)return 1;let e=1/(1-.18);return i<.18?e*i*i/(2*.18):i>1-.18?1-e*(1-i)*(1-i)/(2*.18):e*(i-.18/2)}function _r(i,t){let e=i.dur>0?gd((t-i.t0)/i.dur,0,1):1,n=Cm(e),s=i.from.X+(i.to.X-i.from.X)*n,r=i.from.Z+(i.to.Z-i.from.Z)*n,a=Li[i.gait]??Li.walk,o=0,l=0;if(i.steps>0&&e>0&&e<1){let u=n*i.steps%1,f=Math.min(1,e*6,(1-e)*6);o=a.height*Math.sin(u*Math.PI)*f,l=a.rock*Math.sin(u*Math.PI*2)*f*Math.sign(i.to.X-i.from.X||1)}let c=e>0&&e<.86&&i.dist>30,h=rn(sn(i.from.X,i.from.Z,i.to.X,i.to.Z),{share:a.turn,max:40}),d=e<=0?null:c||i.yaw===null?h:i.yaw;return{X:s,Z:r,lift:o,rock:l,yaw:d,u:e,moving:e>0&&e<1,done:e>=1}}function _d(i,t,e){return i==="left"?{X:e.x[0]-160,Z:t.Z}:i==="right"?{X:e.x[1]+160,Z:t.Z}:i==="back"?{X:t.X*.6,Z:e.z[0]}:{X:t.X,Z:t.Z}}var Vc=Object.freeze(["still","wander","visit","patrol","pace","swarm"]),Rm=Object.freeze({wander:{every:11,restless:.55,radius:.05,gait:"stroll"},visit:{every:14,restless:.75,gait:"walk"},patrol:{every:9,restless:1,gait:"march"},pace:{every:5,restless:.85,width:.05,gait:"walk"},swarm:{every:2.6,restless:.8,radius:.035,gait:"scurry"}}),Ni=i=>typeof i=="number"&&Number.isFinite(i),Hc=i=>Array.isArray(i)&&i.length===2&&Ni(i[0])&&Ni(i[1]);function vd(i){if(!i||typeof i!="object"||!Vc.includes(i.kind)||i.kind==="still")return null;let t=Rm[i.kind],e={kind:i.kind,every:Math.max(1.5,Ni(i.every)?i.every:t.every),restless:Math.max(0,Math.min(1,Ni(i.restless)?i.restless:t.restless)),gait:Li[i.gait]?i.gait:t.gait,radius:Math.max(.005,Math.min(.3,Ni(i.radius)?i.radius:t.radius??.05)),width:Math.max(.01,Math.min(.4,Ni(i.width)?i.width:t.width??.05)),spots:Array.isArray(i.spots)?i.spots.filter(Hc).map(n=>[n[0],n[1]]):[],marks:Array.isArray(i.marks)?i.marks.filter(n=>typeof n=="string"):[],path:Array.isArray(i.path)?i.path.filter(Hc).map(n=>[n[0],n[1]]):[],loop:i.loop===!0,faces:Hc(i.faces)?[i.faces[0],i.faces[1]]:null,yaw:Ni(i.yaw)?i.yaw:null};return e.kind==="visit"&&e.spots.length+e.marks.length===0||e.kind==="patrol"&&e.path.length<2?null:e}function Md(i,{home:t,rig:e,marks:n=[],seed:s=1}){if(!i)return null;let r=h=>e.standing(h),a=e.fractionOf(t.X,t.Z),o=h=>{let d=e.standing([a[0]-h/2,a[1]]),u=e.standing([a[0]+h/2,a[1]]);return d&&u?Math.abs(u.X-d.X):120},l=i.faces?r(i.faces):null,c={...i,home:{X:t.X,Z:t.Z},seed:s,places:[],faceAt:l};if(i.kind==="visit"){let h=i.marks.map(u=>n.find(f=>f.id===u)).filter(Boolean).map(u=>({X:u.X,Z:u.Z,yaw:u.yaw??null})),d=i.spots.map(r).filter(Boolean).map(u=>({X:u.X,Z:u.Z,yaw:null}));if(c.places=[{X:t.X,Z:t.Z,yaw:null},...h,...d],c.places.length<2)return null}else if(i.kind==="patrol"){if(c.places=i.path.map(r).filter(Boolean).map(h=>({X:h.X,Z:h.Z,yaw:null})),c.places.length<2)return null}else i.kind==="pace"?c.reach=o(i.width):c.reach=o(i.radius);return c}function ri(i,t,e=0){return Wu((i*2654435761^t*97+e*7919)>>>0)()}var Pm=16;function yd(i,t){if(t<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="patrol"){let r=i.places.length,a=i.loop?t%r:Im(t,r);return{...i.places[a],yaw:i.places[a].yaw??null}}let e=t;for(let r=0;e>0&&ri(i.seed,e,1)>=i.restless;r++){if(r>=Pm)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};e--}if(e<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="visit"){let r=Math.floor(ri(i.seed,e,2)*i.places.length);return{...i.places[r],yaw:i.places[r].yaw??null}}if(i.kind==="pace"){let r=(e%2===0?-1:1)*(.35+.15*ri(i.seed,e,3));return{X:i.home.X+r*i.reach,Z:i.home.Z+(ri(i.seed,e,4)-.5)*i.reach*.2,yaw:null}}let n=ri(i.seed,e,5)*Math.PI*2,s=Math.sqrt(ri(i.seed,e,6))*i.reach/2;return{X:i.home.X+Math.cos(n)*s,Z:i.home.Z+Math.sin(n)*s*.7,yaw:null}}function Im(i,t){let e=2*(t-1),n=i%e;return n<t?n:e-n}function Lm(i,t){return i.every*(.1+.4*ri(i.seed,t,8))}function Ha(i,t){let e=ri(i.seed,0,9)*i.every,n=t+e,s=Math.floor(n/i.every),r=n-s*i.every,a=yd(i,s-1),o=yd(i,s),l=u=>i.faceAt?rn(sn(u.X,u.Z,i.faceAt.X,i.faceAt.Z),{share:.7,max:50}):u.yaw??null;if(Math.abs(o.X-a.X)+Math.abs(o.Z-a.Z)<.5)return{X:o.X,Z:o.Z,yaw:l(o),lift:0,rock:0,moving:!1};let c=Lm(i,s),h=Di(a,o,{t0:c,gait:i.gait,yaw:l(o),maxDur:Math.max(.4,(i.every-c)*.92)}),d=_r(h,r);return d.moving?{X:d.X,Z:d.Z,yaw:d.yaw,lift:d.lift,rock:d.rock,moving:!0}:{X:d.X,Z:d.Z,yaw:r<c?l(a):l(o),lift:0,rock:0,moving:!1}}var Va=Object.freeze(["line","huddle","talk","gangup","panel","standoff","circle","queue","scatter","audience"]),Dm=Math.PI/180,bd=(i,t,e)=>Math.max(t,Math.min(e,i)),cs=i=>Math.round(i*10)/10,Nm=(i,t=180)=>Math.max(t*.5,...i.map(e=>e.w??t)),ai=(i,t,e,n,s=.7,r=52)=>rn(sn(i,t,e,n),{share:s,max:r});function Sd(i,{cards:t=[],focus:e={X:0,Z:-400},target:n=null,speakers:s=[],party:r=!1,limits:a=null,seed:o=1,dir:l="back"}={}){let c=t.filter(u=>r||!u.pc||u.id===n||s.includes(u.id));if(!c.length)return[];let h=Nm(c),d;switch(i){case"huddle":d=km(c,e,h);break;case"talk":d=Om(c,e,h,s);break;case"gangup":d=Bm(c,e,h,n);break;case"panel":d=zm(c,e,h);break;case"standoff":d=Hm(c,e,h);break;case"circle":d=Vm(c,e,h);break;case"queue":d=Gm(c,e,h,o,l);break;case"scatter":d=Wm(c,e,h,a,o);break;case"audience":d=Fm(c,e,h,a);break;default:d=Um(c,e,h)}return d.map(u=>({id:u.id,X:cs(a?bd(u.X,a.x[0],a.x[1]):u.X),Z:cs(a?bd(u.Z,a.z[0],a.z[1]):u.Z),yaw:cs(u.yaw??0),lean:cs(u.lean??0),pitch:cs(u.pitch??0)}))}var bn=i=>[...i].sort((t,e)=>t.X-e.X||(t.id<e.id?-1:1));function Um(i,t,e){let n=[],s=[i.filter(a=>!a.pc),i.filter(a=>a.pc)],r=s[0].length?220:0;return s.forEach((a,o)=>{let l=bn(a),c=e*1.12;l.forEach((h,d)=>n.push({id:h.id,X:t.X+(d-(l.length-1)/2)*c,Z:t.Z+o*r,yaw:0}))}),n}function Fm(i,t,e,n){let s=bn(i),r=n?n.z[1]:t.Z+600,a=Math.max(t.Z+280,r-Math.max(150,(r-t.Z)*.2)),o=Math.ceil(s.length/2),l=[s.slice(0,o).reverse(),s.slice(o)],c=[];return l.forEach((h,d)=>{let u=d===0?-1:1;h.forEach((f,x)=>{let g=t.X+u*(e*.95+x*e*1.15),m=a-x*45;c.push({id:f.id,X:g,Z:m,yaw:ai(g,m,t.X,t.Z,.6,40),pitch:-2})})}),c}function km(i,t,e){let n=bn(i),s=Yu({x:t.X,z:t.Z},n.length,{r:e*(.45+.08*n.length),lean:8,pitch:6});return n.map((r,a)=>({id:r.id,X:s[a].x,Z:s[a].z,yaw:s[a].yaw,lean:s[a].lean,pitch:s[a].pitch}))}function Om(i,t,e,n){let s=n.filter(u=>i.some(f=>f.id===u)),r=bn(i.filter(u=>!s.includes(u.id)));for(;s.length<2&&r.length;)s.push(r.shift().id);let[a,o]=s,l=e*.78,c=[],h={X:t.X-l,Z:t.Z},d={X:t.X+l,Z:t.Z};return a&&c.push({id:a,X:h.X,Z:h.Z,yaw:ai(h.X,h.Z,d.X,d.Z,.85,58),lean:2}),o&&c.push({id:o,X:d.X,Z:d.Z,yaw:ai(d.X,d.Z,h.X,h.Z,.85,58),lean:-2}),r.forEach((u,f)=>{let x=f%2===0?-1:1,g=Math.floor(f/2)+1,m=t.X+x*(l+e*(.55+g*.95)),p=t.Z-120-g*60;c.push({id:u.id,X:m,Z:p,yaw:ai(m,p,t.X,t.Z,.6,40)})}),c}function Bm(i,t,e,n){let s=i.find(d=>d.id===n)??null,r=bn(i.filter(d=>d!==s)),a=r.length,o=[];s&&o.push({id:s.id,X:t.X,Z:t.Z+60,yaw:0,pitch:3});let l=Math.min(200,90+a*22),c=e*(.85+a*.17),h=140+a*14;return r.forEach((d,u)=>{let f=a>1?u/(a-1):.5,g=(-l/2+f*l)*Dm,m=t.X+Math.sin(g)*c,p=t.Z-Math.cos(g)*h,b=Math.sign(Math.sin(g))||0;o.push({id:d.id,X:m,Z:p,yaw:ai(m,p,t.X,t.Z+60,.8,55),lean:-b*7,pitch:5})}),o}function zm(i,t,e){let n=bn(i.filter(a=>!a.pc)),s=n.length,r=n.map((a,o)=>{let l=s>1?(o-(s-1)/2)/((s-1)/2):0,c=t.X+l*((s-1)/2)*e*1.1,h=t.Z-160+90*l*l;return{id:a.id,X:c,Z:h,yaw:cs(-l*14),pitch:-2}});return bn(i.filter(a=>a.pc)).forEach((a,o,l)=>{let c=t.X+(o-(l.length-1)/2)*e*1.1;r.push({id:a.id,X:c,Z:t.Z+260,yaw:0})}),r}function Hm(i,t,e){let n=bn(i.filter(a=>!a.pc)),s=bn(i.filter(a=>a.pc));if(!s.length){let a=Math.ceil(n.length/2);s=n.slice(a),n=n.slice(0,a)}if(!n.length){let a=Math.ceil(s.length/2);n=s.slice(0,a),s=s.slice(a)}let r=Ju({x:t.X,z:t.Z},n,s,{gap:e*2.2,spread:e*1.35,depthStep:70});return[...n,...s].map((a,o)=>({id:a.id,X:r[o].x,Z:r[o].z,yaw:r[o].yaw,lean:r[o].lean,pitch:r[o].pitch}))}function Vm(i,t,e){let n=bn(i),s=Math.max(e*.9,e*1.05*n.length/(2*Math.PI*.7)),r=$u({x:t.X,z:t.Z},s,n.length,{open:n.length>5?70:110});return n.map((a,o)=>({id:a.id,X:r[o].x,Z:r[o].z,yaw:r[o].yaw}))}function Gm(i,t,e,n,s="back"){let r=s==="left"||s==="right",a=s==="left"?-1:1,o=c=>r?-Math.abs(c.X-t.X):s==="front"?-c.Z:c.Z;return[...i].sort((c,h)=>o(h)-o(c)||(c.id<h.id?-1:1)).map((c,h)=>{let d=Math.sin((h+1)*2.399+n),u,f;r?(u=t.X+a*h*e*1.08,f=t.Z+d*26-h*8):(u=t.X+d*e*.18+h*e*.12,f=t.Z+(s==="front"?1:-1)*h*175);let x=h===0?ai(u,f,t.X,t.Z-300,.55,38):ai(u,f,t.X,t.Z,.55,38);return{id:c.id,X:u,Z:f,yaw:x,pitch:h===0?0:2}})}function Wm(i,t,e,n,s){let r=bn(i),a=r.length,o=n?[n.x[0]*.7,n.x[1]*.7]:[t.X-e*a*.8,t.X+e*a*.8];return r.map((l,c)=>{let h=a>1?c/(a-1):.5,d=o[0]+(o[1]-o[0])*h,u=t.Z+Math.sin((c+1)*1.7+s)*260;return{id:l.id,X:d,Z:u,yaw:ai(d,u,t.X,t.Z,.5,40)}})}var Ga=1/120,yr=Object.freeze({card:{w:280,h:468},holdLift:70,stickLength:134,lane:150,passInFront:85,gripRate:16,limits:{x:[-1800,1800],z:[-2300,260]},zoneEvery:4,look:{reach:900,most:22,linger:2.6},magnet:{overlap:.42,lane:110,rate:9}}),Wn=(i,t,e)=>Math.max(t,Math.min(e,i));function vr(i,t,e,n,s,r=16,a=.72){let o=r*r*(n-i[t])-2*a*r*i[e];i[e]+=o*s,i[t]+=i[e]*s}function Xm(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return 1e3+(t>>>0)%9e3}var hs=class{constructor(t,e=[],n={}){this.scene=t,this.opts={...yr,...n,card:{...yr.card,...n.card??{}},limits:{...yr.limits,...n.limits??{}},look:{...yr.look,...n.look??{}},magnet:{...yr.magnet,...n.magnet??{}}},this.clock=typeof n.clock=="function"?n.clock:()=>this.time,this.rig=os(t.painting,t.rig);let s=fd(t.marks,this.rig);this.marks=s.marks,this.problems=s.dropped.map(r=>`mark "${r}" is above the horizon and cannot be stood on`),this.zones=t.zones,this.bands=ud(t.zones),this.focus=this.#e(),this.risers=this.#t(),this.cards=new Map,this.resting=new Map,this.touching=new Map,this.inZones=new Map,this.events=[],this.recentBonks=[],this.time=0,this.acc=0,this.steps=0,this.lifeOn=!0,this.board=!1;for(let r of e)this.addCard(r)}#t(){let{cam:t,map:e}=this.rig,n=t.floorY-t.cy;return(this.scene.occluders??[]).filter(s=>s.riser).flatMap(s=>{let r=this.rig.standing([s.x,s.base]);if(!r)return[];let a=(t.f-r.Z)/t.f,o=Math.min(...s.poly.map(c=>c[1])),l=s.poly.map(c=>(e.x(c[0])-t.cx)*a);return[{Z:r.Z,top:n-(e.y(o)-t.cy)*a,x0:Math.min(...l),x1:Math.max(...l),hideAtMost:s.hideAtMost,camY:n,f:t.f}]})}riserFor(t,e,n,s){let r=0;for(let a of this.risers){if(e>=a.Z-4||t+n/2<a.x0||t-n/2>a.x1)continue;let o=a.camY+(a.top-a.camY)*((a.f-e)/(a.f-a.Z));r=Math.max(r,o-a.hideAtMost*s)}return Math.max(0,Math.min(r,s*1.1))}#e(){let t=this.scene.rig,e=this.scene.focus??[t.vanish??.5,t.horizon+(t.floorFront-t.horizon)*.72];return this.rig.standing(e)??{X:0,Z:-400}}addCard(t){if(!t?.id||this.cards.has(t.id))return null;let e=this.opts.card.w,n=this.opts.card.h,s=this.scene.cardScale*(t.size??1),r=0,a=0,o=t.mark?this.marks.find(d=>d.id===t.mark):null;if(o)r=o.X,a=o.Z;else if(t.at){let d=this.rig.standing(t.at);d&&(r=d.X,a=d.Z)}else Number.isFinite(t.X)&&Number.isFinite(t.Z)&&(r=t.X,a=t.Z);let l={id:t.id,person:t,s,w:e*s,h:n*s,seed:Xm(t.id),puppet:Qu({id:t.id,x:r,y:0,rod:0,w:e*s,h:n*s,scale:1}),Z:a,restZ:a,zOff:0,grip:0,holder:null,hand:null,yaw:t.yaw??0,yawV:0,yawTo:t.yaw??0,lean:t.lean??0,leanV:0,leanTo:t.lean??0,pitch:t.pitch??0,pitchV:0,pitchTo:t.pitch??0,lift:0,liftV:0,liftTo:0,mark:null,walk:null,routine:null,still:t.still===!0,living:!1,packed:t.packed===!0,stepLift:0,stepRock:0,look:0,lookV:0,attention:null,riser:0,riserTo:0};l.riser=l.riserTo=this.riserFor(r,a,l.w,l.h),this.cards.set(l.id,l),o&&this.#n(l,o,!0);let c=vd(t.life);if(c&&(l.routine=Md(c,{home:{X:r,Z:a},rig:this.rig,marks:this.marks,seed:l.seed})),l.routine&&!l.still&&this.lifeOn&&!o){let d=Ha(l.routine,this.clock());l.puppet.x=l.puppet.restX=d.X,l.Z=l.restZ=d.Z,d.yaw!==null&&(l.yaw=l.yawTo=d.yaw),l.living=!0}let h=t.enter;if(h&&typeof h=="object"&&h.from==="rise"){let d=Number.isFinite(h.t0)?h.t0:this.clock();l.rise={t0:d,dur:Number.isFinite(h.dur)?h.dur:.7}}if(h&&typeof h=="object"&&["left","right","back"].includes(h.from)){let d=Number.isFinite(h.t0)?h.t0:this.clock(),u=_d(h.from,{X:r,Z:a},this.opts.limits),f=Di(u,{X:r,Z:a},{t0:d,gait:h.gait??"walk",yaw:l.yawTo,maxDur:8});if(this.clock()<f.t0+f.dur){l.walk=f;let x=_r(f,this.clock());l.puppet.x=l.puppet.restX=x.X,l.Z=l.restZ=x.Z}}return l}removeCard(t){let e=this.cards.get(t);if(!e)return!1;e.mark&&this.resting.get(e.mark)?.delete(t),this.cards.delete(t),this.inZones.delete(t);for(let n of[...this.touching.keys()])n.split("|").includes(t)&&this.touching.delete(n);return!0}walkTo(t,e,{t0:n=null,gait:s="walk",yaw:r=null,lean:a=null,pitch:o=null,still:l=null,packed:c=null}={}){let h=this.cards.get(t);if(!h||h.holder!==null)return null;let d=null,u=null;if(e?.mark?(u=this.marks.find(m=>m.id===e.mark)??null,u&&(d={X:u.X,Z:u.Z})):Array.isArray(e?.at)?d=this.rig.standing(e.at):Number.isFinite(e?.X)&&Number.isFinite(e?.Z)&&(d={X:e.X,Z:e.Z}),!d)return null;let f=this.opts.limits;if(d={X:Wn(d.X,f.x[0],f.x[1]),Z:Wn(d.Z,f.z[0],f.z[1])},h.mark&&(this.resting.get(h.mark)?.delete(t),h.mark=null),u){let m=this.resting.get(u.id);m||this.resting.set(u.id,m=new Set),m.add(t),h.mark=u.id}l!==null&&(h.still=!!l),c!==null&&(h.packed=!!c);let x=u?Oa(u,this.#s()):{yaw:r??h.yawTo,lean:a??0,pitch:o??0,lift:0},g=n??this.clock();return h.walk=Di({X:h.puppet.x,Z:h.Z},d,{t0:g,gait:s,yaw:x.yaw}),h.walk.pose=x,h.walk.mark=u?.id??null,h.living=!1,this.events.push({type:"walk",card:t,to:{X:d.X,Z:d.Z},mark:u?.id??null,t:this.time}),h.walk}setStill(t,e){let n=this.cards.get(t);n&&(n.still=!!e)}setLife(t){this.lifeOn=!!t}setBoard(t){this.board=!!t}hold(t,e){let n=this.cards.get(t);return!n||n.holder!==null&&n.holder!==e?!1:(n.holder===e||(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.holder=e,n.hand={x:n.puppet.x,z:n.Z},n.puppet.heldBy=e,this.events.push({type:"grab",card:t,by:e,t:this.time})),!0)}setHand(t,{x:e,z:n}){let s=this.cards.get(t);if(!s||s.holder===null)return;let r=this.opts.limits;s.hand.x=Wn(e,r.x[0],r.x[1]),s.hand.z=Wn(n,r.z[0],r.z[1])}release(t,e=null){let n=this.cards.get(t);if(!n||n.holder===null)return null;let s=n.holder,r=e??this.landingFor(t);n.holder=null,n.hand=null,n.puppet.heldBy=null;let a=r.mark?this.marks.find(l=>l.id===r.mark)??null:null;a?this.#n(n,a,!1):(n.puppet.restX=r.X,n.restZ=Wn(r.Z,this.opts.limits.z[0],this.opts.limits.z[1]),n.mark=null);let o={type:"drop",card:t,by:s,t:this.time,mark:a?.id??null,X:n.puppet.restX,Z:n.restZ};return this.events.push(o),o}landingFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return null;let n=e.puppet.x,s=e.hand?.z??e.Z,r=zc(this.marks,this.resting,n,s,this.scene.reach.snap);return!r&&this.scene.marksOnly&&(r=zc(this.marks,this.resting,n,s,1/0)),{X:n,Z:Wn(s,this.opts.limits.z[0],this.opts.limits.z[1]),mark:r?.id??null}}handOver(t,e){let n=this.cards.get(t);return n?(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.hand??={x:n.puppet.x,z:n.Z},n.holder=e,n.puppet.heldBy=e,!0):!1}#i(t){t.walk&&(t.walk=null,t.puppet.restX=t.puppet.x,t.restZ=t.Z,t.stepLift=0,t.stepRock=0)}perform(t,e){let n=this.cards.get(t);n&&td(n.puppet,e)}#n(t,e,n){let s=this.resting.get(e.id);s||this.resting.set(e.id,s=new Set),s.add(t.id),t.mark=e.id;let r=Oa(e,this.#s());t.puppet.restX=e.X,t.restZ=e.Z,t.yawTo=r.yaw,t.leanTo=r.lean,t.pitchTo=r.pitch,t.liftTo=r.lift,n&&(t.puppet.x=e.X,t.Z=e.Z,t.yaw=r.yaw,t.lean=r.lean,t.pitch=r.pitch,t.lift=r.lift),this.events.push({type:"mark",card:t.id,mark:e.id,t:this.time})}#s(){return{zones:this.zones,pointOnFloor:t=>this.rig.standing(t),cardAt:t=>{let e=this.cards.get(t);return e?{X:e.puppet.x,Z:e.Z}:null}}}tidy({t0:t=null}={}){let e=this.marks.map(r=>({...r,capacity:r.capacity-(this.resting.get(r.id)?.size??0)})).filter(r=>r.capacity>0),n=[...this.cards.values()].filter(r=>!r.mark&&r.holder===null&&!r.walk).map(r=>({id:r.id,X:r.puppet.x,Z:r.Z})),s=Ba(e,n);for(let{card:r,mark:a}of s)this.walkTo(r,{mark:a},{t0:t,gait:"hurry",still:!0});return s}advance(t){this.acc+=Math.min(Math.max(t,0),.05);let e=0;for(;this.acc>=Ga-1e-9;)this.step(Ga),this.acc-=Ga,e++;return e}step(t=Ga){this.time+=t,this.steps++;let e=this.opts,n=this.clock(),s=[...this.cards.values()].filter(r=>r.holder!==null);for(let r of this.cards.values()){let a=r.puppet,o=r.holder!==null;o||this.#r(r,n),a.heldBy=o?r.holder:null,a.target=o?{x:r.hand.x,y:0}:null,ed(a,t),r.Z+=((o?r.hand.z:r.restZ)-r.Z)*Math.min(1,t*(o?24:12)),r.grip+=((o?1:0)-r.grip)*Math.min(1,t*e.gripRate),vr(r,"yaw","yawV",r.yawTo,t,16,.72),vr(r,"lean","leanV",r.leanTo,t,18,.8),vr(r,"pitch","pitchV",r.pitchTo,t,18,.8),vr(r,"lift","liftV",r.liftTo,t,18,.62),vr(r,"look","lookV",o?0:this.#l(r,s,n),t,7,.9),r.riser+=(r.riserTo-r.riser)*Math.min(1,t*9)}if(this.#c(t),this.steps%e.zoneEvery===0&&(this.#u(),this.#o(t*e.zoneEvery),this.risers.length))for(let r of this.cards.values())r.riserTo=this.riserFor(r.puppet.x,r.Z,r.w,r.h)}#r(t,e){let n=t.puppet;if(t.walk){let r=_r(t.walk,e);n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw),r.done&&this.#a(t);return}if(!!t.routine&&this.lifeOn&&!t.still){let r=Ha(t.routine,e);if(!t.living&&za({X:n.restX,Z:t.restZ},r)>12){let a=Di({X:n.x,Z:t.Z},r,{t0:e,gait:t.routine.gait}),o=Ha(t.routine,e+a.dur);t.walk=Di({X:n.x,Z:t.Z},o,{t0:e,gait:t.routine.gait,yaw:o.yaw??t.yawTo}),t.walk.pose={yaw:o.yaw??t.yawTo,lean:0,pitch:0,lift:0},t.walk.mark=null,t.walk.back=!0;return}t.living=!0,n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw);return}t.living=!1,t.stepLift*=.8,t.stepRock*=.8}#a(t){let e=t.walk;t.walk=null,t.puppet.restX=e.to.X,t.restZ=e.to.Z,t.stepLift=0,t.stepRock=0;let n=e.pose??{yaw:e.yaw??t.yawTo,lean:0,pitch:0,lift:0};t.yawTo=n.yaw??t.yawTo,t.leanTo=n.lean??0,t.pitchTo=n.pitch??0,t.liftTo=n.lift??0,t.living=!1,e.mark&&this.events.push({type:"mark",card:t.id,mark:e.mark,t:this.time}),e.back||this.events.push({type:"arrive",card:t.id,mark:e.mark??null,t:this.time})}#l(t,e,n){let s=this.opts.look,r=null;if(t.attention&&t.attention.until>n?r=this.cards.get(t.attention.id)??null:t.attention=null,!r){let o=s.reach;for(let l of e){if(l===t)continue;let c=za({X:l.puppet.x,Z:l.Z},{X:t.puppet.x,Z:t.Z});c<o&&(o=c,r=l)}}if(!r)return 0;let a=rn(sn(t.puppet.x,t.Z,r.puppet.x,r.Z),{share:.8,max:60});return Wn(a-t.yaw,-s.most,s.most)}#o(t){let e=this.opts.magnet,n=[...this.cards.values()].filter(s=>s.holder===null&&!s.walk&&!s.packed&&!(s.routine&&this.lifeOn&&!s.still));for(let s=0;s<n.length;s++)for(let r=s+1;r<n.length;r++){let a=n[s],o=n[r];if(Math.abs(a.restZ-o.restZ)>=e.lane)continue;let l=o.puppet.restX-a.puppet.restX,h=(a.w+o.w)/2-Math.min(a.w,o.w)*e.overlap-Math.abs(l);if(h<=.5)continue;let d=l!==0?Math.sign(l):a.id<o.id?1:-1,u=Math.min(h/2,h*e.rate*t),f=this.opts.limits.x;a.puppet.restX=Wn(a.puppet.restX-d*u,f[0],f[1]),o.puppet.restX=Wn(o.puppet.restX+d*u,f[0],f[1])}}#c(t){let e=this.opts,n=new Set;for(let s of this.cards.values()){if(s.holder===null){s.zOff+=(0-s.zOff)*Math.min(1,t*11);continue}let r=!1;for(let a of this.cards.values()){if(a===s||Math.abs(a.Z-s.Z)>=e.lane)continue;let o=s.id<a.id?`${s.id}|${a.id}`:`${a.id}|${s.id}`,l=mr(s.puppet),c=mr(a.puppet);if(Math.min(l.right,c.right)-Math.max(l.left,c.left)>0&&(r=!0),n.has(o))continue;n.add(o);let h=this.touching.get(o);h||this.touching.set(o,h=new Set);let d=s.id<a.id?[s,a]:[a,s];for(let u of sd(d.map(f=>f.puppet),h)){let f={type:"bonk",t:this.time,a:u.a,b:u.b,x:u.x,speed:u.speed,Z:s.Z};this.events.push(f),this.recentBonks.push(f);let x=this.clock()+this.opts.look.linger,g=this.cards.get(u.a),m=this.cards.get(u.b);g&&m&&(g.attention={id:m.id,until:x},m.attention={id:g.id,until:x})}}s.zOff+=((r?e.passInFront:0)-s.zOff)*Math.min(1,t*11)}for(let[s,r]of this.touching)r.size===0&&this.touching.delete(s);this.recentBonks=this.recentBonks.filter(s=>this.time-s.t<.9)}#u(){if(!this.zones.length)return;let t=new Map;for(let e of this.cards.values()){let n=this.rig.fractionOf(e.puppet.x,e.Z);t.set(e.id,new Set(cd(this.zones,n[0],n[1]).map(s=>s.id)))}for(let e of dd(this.inZones,t))this.events.push({...e,t:this.time});this.inZones=t}drain(){let t=this.events;return this.events=[],t}marksFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return[];let n=this.scene.reach;return md(this.marks,this.resting,e.hand.x,e.hand.z,{show:n.show,snap:n.snap,max:5}).map(s=>({id:s.id,for:t,X:s.mark.X,Z:s.mark.Z,label:s.mark.label,alpha:s.alpha,target:s.target,pose:Oa(s.mark,this.#s())}))}zoneStates(){let t=[...this.cards.values()].filter(e=>e.holder!==null).map(e=>{let n=this.rig.fractionOf(e.hand.x,e.hand.z);return{x:n[0],y:n[1]}});return hd(this.zones,t)}snapshot({viewer:t=null,selected:e=null}={}){let n=this.time,s=this.clock(),r=[],a=[];for(let o of this.cards.values()){let l=o.puppet,c=Ku(n,o.seed,o.person.demeanour??"calm",{speakerYaw:null}),h=id(l),d=o.grip,u=o.rise?Zm(o.rise,s):1;o.rise&&s>o.rise.t0+o.rise.dur&&(o.rise=null),r.push({id:o.id,name:o.person.name??o.id,colour:o.person.colour??null,x:l.x+l.jx,z:o.Z+o.zOff,lift:c.lift*(1-d)+this.opts.holdLift*d+h.lift+o.lift+o.stepLift+o.riser,lean:l.lean+(o.lean+c.lean)*(1-.85*d)+o.stepRock,yaw:o.yaw+l.turn+h.shakeY+c.yaw+o.look,pitch:o.pitch+c.pitch+h.tipX+h.dip*.4,grip:d,breathe:c.breathe,squash:h.squash*u,scale:o.s,held:o.holder!==null,holder:o.holder,mark:o.mark,walking:!!o.walk||o.living&&Math.abs(o.stepLift)>.2,selected:!!e?.has?.(o.id),emote:this.#h(o,n)}),t!==null&&o.holder===t&&a.push(...this.marksFor(o.id))}return{t:n,cards:r,bonks:this.recentBonks.map(o=>({...o})),marks:a,zones:this.zoneStates(),board:this.board?this.boardState():null}}boardState(){let t={};for(let e of this.zones)t[e.id]=0;for(let e of this.inZones.values())for(let n of e)n in t&&t[n]++;return{counts:t,bands:this.bands}}bandBetween(t,e){return!t||!e?null:t===e?"engaged":this.bands.some(n=>n.a===t&&n.b===e||n.a===e&&n.b===t)?"near":"far"}#h(t,e){let n=t.person.emote;if(!n?.id)return null;let s=(e-(n.t0??0))%6,r=s<0?0:s<.2?s/.2:s>4.4?Math.max(0,1-(s-4.4)/.6):1,a=s<.3?.6+.4*Math.sin(s/.3*Math.PI*.5)+.12*Math.sin(s/.3*Math.PI):1;return{id:n.id,age:s,opacity:r,pop:a}}placeOf(t){let e=this.cards.get(t);if(!e)return null;let n=e.walk?e.walk.to.X:e.puppet.restX,s=e.walk?e.walk.to.Z:e.restZ,r=e.walk?e.walk.pose?.yaw??e.yawTo:e.yawTo;return{id:e.id,at:this.rig.fractionOf(n,s).map(a=>Math.round(a*1e4)/1e4),mark:e.mark,yaw:Math.round(r*10)/10}}formationMoves(t,{ids:e=null,focus:n=null,target:s=null,speakers:r=[],party:a=!1,gait:o="walk",dir:l="back",away:c=!1}={}){let h=this.standing(),d=e?h.filter(g=>e.includes(g.id)):h,u=this.focus;if(Array.isArray(n))u=this.rig.standing(n)??this.focus;else if(typeof n=="string"&&this.cards.has(n)){let g=this.cards.get(n);u={X:g.puppet.restX,Z:g.restZ}}let f=["huddle","gangup","queue"].includes(t);return Sd(t,{cards:d,focus:u,target:s,speakers:r,party:a,dir:l,limits:{x:this.opts.limits.x,z:[this.opts.limits.z[0],200]},seed:this.steps%7}).map(g=>({id:g.id,at:this.rig.fractionOf(g.X,g.Z).map(m=>Math.round(m*1e4)/1e4),yaw:c?180:g.yaw,lean:c?0:g.lean,pitch:c?0:g.pitch,gait:o,still:!0,packed:f}))}standing(){return[...this.cards.values()].filter(t=>t.holder===null).map(t=>({id:t.id,X:t.walk?t.walk.to.X:t.puppet.restX,Z:t.walk?t.walk.to.Z:t.restZ,w:t.w,pc:t.person.pc===!0}))}exportPlaces(){return[...this.cards.keys()].map(t=>this.placeOf(t))}};function Zm(i,t){let e=Math.max(0,Math.min(1,(t-i.t0)/i.dur));if(e<=0)return .02;let n=1.9,s=n+1;return Math.max(.02,1+s*(e-1)**3+n*(e-1)**2)}var Wa=class{constructor({limit:t=600,report:e=()=>{},onFatal:n=()=>{}}={}){this.limit=t,this.report=e,this.onFatal=n,this.failures=0,this.total=0}run(t){try{return t(),this.failures=0,!0}catch(e){return this.failures++,this.total++,(this.failures<=3||this.failures%300===0)&&this.report(e,this.failures),this.failures>=this.limit?(this.onFatal(e),!1):!0}}};var Mr=Object.freeze({every:33,heartbeat:1e3,delay:100,silent:2e3}),br=i=>Math.round(i),oi=i=>Math.round(i*10)/10,Xa=class{constructor({stage:t,scene:e,me:n,now:s,clock:r=s,send:a,mayHold:o=()=>!0,onLost:l=()=>{},onDrop:c=()=>{}}){Object.assign(this,{stage:t,scene:e,me:n,now:s,clock:r,mayHold:o,onLost:l,onDrop:c}),this.wire=a,this.mine=new Map,this.remote=new Map,this.sent=0}send(t){this.sent++,this.wire({scene:this.scene,...t})}holderOf(t){return this.mine.has(t)?this.me:this.remote.get(t)?.by??null}grab(t){let e=this.stage.cards.get(t);if(!e||!this.mayHold(t,this.me)||!this.stage.hold(t,this.me))return!1;let n=this.now();return this.mine.set(t,{stamp:{t:br(n),user:this.me},last:{t:n,x:e.hand.x,y:e.hand.z}}),this.send({type:"grab",id:t,t:br(n),x:oi(e.hand.x),z:oi(e.hand.z)}),!0}move(t,e,n){let s=this.mine.get(t);if(!s)return;this.stage.setHand(t,{x:e,z:n});let r=this.stage.cards.get(t).hand;this.#t(t,s,r,this.now())}#t(t,e,n,s){return rd(e.last,n.x,n.z,s,Mr.every)?(e.last={t:s,x:n.x,y:n.z},e.moving=!0,this.send({type:"move",id:t,t:br(s),x:oi(n.x),z:oi(n.z)}),!0):!1}verb(t,e){this.mine.has(t)&&(this.stage.perform(t,e),this.send({type:"verb",id:t,verb:e}))}release(t){if(!this.mine.has(t))return null;this.mine.delete(t);let e=this.stage.landingFor(t);if(!e)return null;let n={X:oi(e.X),Z:oi(e.Z),mark:e.mark},s=this.stage.release(t,n);return s&&(this.send({type:"release",id:t,t:br(this.now()),X:n.X,Z:n.Z,mark:n.mark}),this.onDrop(s)),s}receive(t,e){!t||t.scene!==this.scene||e===this.me||this.stage.cards.has(t.id)&&(t.type==="grab"?this.#e(t,e):t.type==="move"?this.#i(t,e):t.type==="verb"?this.remote.get(t.id)?.by===e&&this.stage.perform(t.id,t.verb):t.type==="release"&&this.#s(t,e))}#e(t,e){if(!this.mayHold(t.id,e))return;let n={t:t.t,user:e},s=this.mine.get(t.id),r=this.remote.get(t.id),a=s?.stamp??r?.stamp??null;a&&r?.by!==e&&ad(a,n)===a||(s&&(this.mine.delete(t.id),this.onLost(t.id)),this.#n(t,e,n))}#i(t,e){let n=this.remote.get(t.id);if(!n){if(this.mine.has(t.id)||!this.mayHold(t.id,e))return;this.#n(t,e,{t:t.t,user:e});return}n.by===e&&(n.buffer.push({t:t.t,x:t.x,y:t.z}),n.heard=this.clock())}#n(t,e,n){this.stage.hold(t.id,e)||this.stage.handOver(t.id,e);let s=new Ua({delay:Mr.delay});s.push({t:t.t,x:t.x,y:t.z}),this.remote.set(t.id,{by:e,stamp:n,buffer:s,heard:this.clock()})}#s(t,e){let n=this.remote.get(t.id);if(!n||n.by!==e)return;this.remote.delete(t.id);let s=this.stage.release(t.id,{X:t.X,Z:t.Z,mark:t.mark??null});s&&this.onDrop(s)}forget(t){this.mine.delete(t),this.remote.delete(t)}userGone(t){for(let[e,n]of[...this.remote])n.by===t&&this.#r(e)}#r(t){this.remote.delete(t);let e=this.stage.release(t);e&&this.onDrop(e)}tick(){let t=this.now(),e=this.clock();for(let[n,s]of[...this.remote]){if(e-s.heard>Mr.silent){this.#r(n);continue}let r=s.buffer.at(t);r&&this.stage.setHand(n,{x:r.x,z:r.y})}for(let[n,s]of this.mine){let r=this.stage.cards.get(n)?.hand;if(!r||this.#t(n,s,r,t))continue;let a=t-s.last.t;(s.moving&&a>=Mr.every||a>=Mr.heartbeat)&&(s.moving=!1,s.last={t,x:r.x,y:r.z},this.send({type:"move",id:n,t:br(t),x:oi(r.x),z:oi(r.z)}))}}close(){for(let t of[...this.mine.keys()])this.release(t);this.remote.clear()}};function wd(i,t,e){let n=new Map(t.filter(r=>r&&typeof r.id=="string").map(r=>[r.id,r])),s=Math.round(e*1e3)/1e3;return i.map(r=>{let a=n.get(r.id);if(!a)return r;let o={...r};if(delete o.X,delete o.Z,delete o.enter,a.mark)o.mark=a.mark,delete o.at;else if(Array.isArray(a.at))o.at=[a.at[0],a.at[1]],delete o.mark;else return r;for(let l of["yaw","lean","pitch"])Number.isFinite(a[l])?o[l]=Math.round(a[l]*10)/10:l!=="yaw"&&delete o[l];return typeof a.still=="boolean"&&(o.still=a.still),typeof a.packed=="boolean"&&(o.packed=a.packed),o.move={t0:s,gait:a.gait??"walk"},o})}function Td(i,{gait:t="walk"}={}){let e=[];for(let n of i)!Array.isArray(n.home)||Array.isArray(n.at)&&Math.abs(n.at[0]-n.home[0])<1e-4&&Math.abs(n.at[1]-n.home[1])<1e-4&&!n.mark&&!n.still&&!n.packed||e.push({id:n.id,at:[n.home[0],n.home[1]],yaw:n.homeYaw??0,lean:0,pitch:0,gait:t,still:!1,packed:!1});return e}function Ed(i,t){return i.map(e=>{if(e.id!==t.id)return e;let n={...e,at:t.at,yaw:t.yaw};return delete n.X,delete n.Z,delete n.enter,delete n.packed,n.life&&(n.still=!0),t.mark?n.mark=t.mark:delete n.mark,n})}var tf=0,Sh=1,ef=2;var Gi=1,nf=2,Gs=3,Mi=0,tn=1,an=2,xn=0,bi=1,_n=2,wh=3,Th=4,sf=5;var Wi=100,rf=101,af=102,of=103,lf=104,cf=200,hf=201,uf=202,df=203,Eh=204,Ah=205,ff=206,pf=207,mf=208,gf=209,xf=210,_f=211,yf=212,vf=213,Mf=214,yo=0,vo=1,Mo=2,Rs=3,bo=4,So=5,wo=6,To=7,Ch=0,bf=1,Sf=2,fn=0,Qr=1,ta=2,ea=3,na=4,ia=5,sa=6,ra=7;var Rh=300,Si=301,Xi=302,Ws=303,Yo=304,aa=306,Eo=1e3,Un=1001,Ao=1002,Be=1003,wf=1004;var oa=1005;var Ve=1006,Jo=1007;var Hn=1008;var on=1009,Ph=1010,Ih=1011,Xs=1012,Ko=1013,Rn=1014,Pn=1015,Le=1016,jo=1017,Qo=1018,Zs=1020,Lh=35902,Dh=35899,Nh=1021,Uh=1022,yn=1023,Fn=1026,wi=1027,Fh=1028,tl=1029,Ti=1030,el=1031;var nl=1033,la=33776,ca=33777,ha=33778,ua=33779,il=35840,sl=35841,rl=35842,al=35843,ol=36196,ll=37492,cl=37496,hl=37488,ul=37489,da=37490,dl=37491,fl=37808,pl=37809,ml=37810,gl=37811,xl=37812,_l=37813,yl=37814,vl=37815,Ml=37816,bl=37817,Sl=37818,wl=37819,Tl=37820,El=37821,Al=36492,Cl=36494,Rl=36495,Pl=36283,Il=36284,fa=36285,Ll=36286;var Pr=2300,Co=2301,xo=2302,fh=2303,ph=2400,mh=2401,gh=2402;var Tf=3200;var Dl=0,Ef=1,Qn="",Ae="srgb",Ir="srgb-linear",Lr="linear",Jt="srgb";var _o=7680;var Af=519,Cf=512,Rf=513,Pf=514,Nl=515,If=516,Lf=517,Ul=518,Df=519,kh=35044;var Oh="300 es",En=2e3,Ps=2001;function qm(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function $m(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Dr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Nf(){let i=Dr("canvas");return i.style.display="block",i}var Ad={},Is=null;function Nr(...i){let t="THREE."+i.shift();Is?Is("log",t,...i):console.log(t,...i)}function Uf(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Dt(...i){i=Uf(i);let t="THREE."+i.shift();if(Is)Is("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Lt(...i){i=Uf(i);let t="THREE."+i.shift();if(Is)Is("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function Bi(...i){let t=i.join(" ");t in Ad||(Ad[t]=!0,Dt(...i))}function Ff(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var kf={[yo]:vo,[Mo]:wo,[bo]:To,[Rs]:So,[vo]:yo,[wo]:Mo,[To]:bo,[So]:Rs},kn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},$e=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Gc=Math.PI/180,Ur=180/Math.PI;function pi(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return($e[i&255]+$e[i>>8&255]+$e[i>>16&255]+$e[i>>24&255]+"-"+$e[t&255]+$e[t>>8&255]+"-"+$e[t>>16&15|64]+$e[t>>24&255]+"-"+$e[e&63|128]+$e[e>>8&255]+"-"+$e[e>>16&255]+$e[e>>24&255]+$e[n&255]+$e[n>>8&255]+$e[n>>16&255]+$e[n>>24&255]).toLowerCase()}function Xt(i,t,e){return Math.max(t,Math.min(e,i))}function Ym(i,t){return(i%t+t)%t}function Wc(i,t,e){return(1-e)*i+e*t}function Nn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function se(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var bt=class i{static{i.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Xt(this.x,t.x,e.x),this.y=Xt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Xt(this.x,t,e),this.y=Xt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Xt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Xt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},On=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[a+0],f=r[a+1],x=r[a+2],g=r[a+3];if(d!==g||l!==u||c!==f||h!==x){let m=l*u+c*f+h*x+d*g;m<0&&(u=-u,f=-f,x=-x,g=-g,m=-m);let p=1-o;if(m<.9995){let b=Math.acos(m),C=Math.sin(b);p=Math.sin(p*b)/C,o=Math.sin(o*b)/C,l=l*p+u*o,c=c*p+f*o,h=h*p+x*o,d=d*p+g*o}else{l=l*p+u*o,c=c*p+f*o,h=h*p+x*o,d=d*p+g*o;let b=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=b,c*=b,h*=b,d*=b}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[a],u=r[a+1],f=r[a+2],x=r[a+3];return t[e]=o*x+h*d+l*f-c*u,t[e+1]=l*x+h*u+c*d-o*f,t[e+2]=c*x+h*f+o*u-l*d,t[e+3]=h*x-o*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),d=o(r/2),u=l(n/2),f=l(s/2),x=l(r/2);switch(a){case"XYZ":this._x=u*h*d+c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d-u*f*x;break;case"YXZ":this._x=u*h*d+c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d+u*f*x;break;case"ZXY":this._x=u*h*d-c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d-u*f*x;break;case"ZYX":this._x=u*h*d-c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d+u*f*x;break;case"YZX":this._x=u*h*d+c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d-u*f*x;break;case"XZY":this._x=u*h*d-c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d+u*f*x;break;default:Dt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+o+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-s)*f}else if(n>o&&n>d){let f=2*Math.sqrt(1+n-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+c)/f}else if(o>d){let f=2*Math.sqrt(1+o-n-d);this._w=(r-c)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+d-n-o);this._w=(a-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Xt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{static{i.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Cd.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Cd.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),d=2*(r*n-a*e);return this.x=e+l*c+a*d-o*h,this.y=n+l*h+o*c-r*d,this.z=s+l*d+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Xt(this.x,t.x,e.x),this.y=Xt(this.y,t.y,e.y),this.z=Xt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Xt(this.x,t,e),this.y=Xt(this.y,t,e),this.z=Xt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Xt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Xc.copy(this).projectOnVector(t),this.sub(Xc)}reflect(t){return this.sub(Xc.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Xt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Xc=new D,Cd=new On,Ut=class i{static{i.prototype.isMatrix3=!0}constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],x=n[8],g=s[0],m=s[3],p=s[6],b=s[1],C=s[4],M=s[7],w=s[2],S=s[5],A=s[8];return r[0]=a*g+o*b+l*w,r[3]=a*m+o*C+l*S,r[6]=a*p+o*M+l*A,r[1]=c*g+h*b+d*w,r[4]=c*m+h*C+d*S,r[7]=c*p+h*M+d*A,r[2]=u*g+f*b+x*w,r[5]=u*m+f*C+x*S,r[8]=u*p+f*M+x*A,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=h*a-o*c,u=o*l-h*r,f=c*r-a*l,x=e*d+n*u+s*f;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/x;return t[0]=d*g,t[1]=(s*c-h*n)*g,t[2]=(o*n-s*a)*g,t[3]=u*g,t[4]=(h*e-s*l)*g,t[5]=(s*r-o*e)*g,t[6]=f*g,t[7]=(n*l-c*e)*g,t[8]=(a*e-n*r)*g,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return Bi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Zc.makeScale(t,e)),this}rotate(t){return Bi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Zc.makeRotation(-t)),this}translate(t,e){return Bi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Zc.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Zc=new Ut,Rd=new Ut().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Pd=new Ut().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Jm(){let i={enabled:!0,workingColorSpace:Ir,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===Jt&&(s.r=Kn(s.r),s.g=Kn(s.g),s.b=Kn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Jt&&(s.r=Cs(s.r),s.g=Cs(s.g),s.b=Cs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Qn?Lr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Bi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Bi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Ir]:{primaries:t,whitePoint:n,transfer:Lr,toXYZ:Rd,fromXYZ:Pd,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ae},outputColorSpaceConfig:{drawingBufferColorSpace:Ae}},[Ae]:{primaries:t,whitePoint:n,transfer:Jt,toXYZ:Rd,fromXYZ:Pd,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ae}}}),i}var Ht=Jm();function Kn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Cs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var us,Ro=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{us===void 0&&(us=Dr("canvas")),us.width=t.width,us.height=t.height;let s=us.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=us}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Dr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Kn(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Kn(e[n]/255)*255):e[n]=Kn(e[n]);return{data:e,width:t.width,height:t.height}}else return Dt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Km=0,Ls=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Km++}),this.uuid=pi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(qc(s[a].image)):r.push(qc(s[a]))}else r=qc(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function qc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Ro.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Dt("Texture: Unable to serialize Texture."),{})}var jm=0,$c=new D,Pe=class i extends kn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=Un,s=Un,r=Ve,a=Hn,o=yn,l=on,c=i.DEFAULT_ANISOTROPY,h=Qn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:jm++}),this.uuid=pi(),this.name="",this.source=new Ls(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new bt(0,0),this.repeat=new bt(1,1),this.center=new bt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ut,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize($c).x}get height(){return this.source.getSize($c).y}get depth(){return this.source.getSize($c).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Dt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Dt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Rh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Eo:t.x=t.x-Math.floor(t.x);break;case Un:t.x=t.x<0?0:1;break;case Ao:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Eo:t.y=t.y-Math.floor(t.y);break;case Un:t.y=t.y<0?0:1;break;case Ao:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Pe.DEFAULT_IMAGE=null;Pe.DEFAULT_MAPPING=Rh;Pe.DEFAULT_ANISOTROPY=1;var me=class i{static{i.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],x=l[9],g=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-g)<.01&&Math.abs(x-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+g)<.1&&Math.abs(x+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let C=(c+1)/2,M=(f+1)/2,w=(p+1)/2,S=(h+u)/4,A=(d+g)/4,y=(x+m)/4;return C>M&&C>w?C<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(C),s=S/n,r=A/n):M>w?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=S/s,r=y/s):w<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(w),n=A/r,s=y/r),this.set(n,s,r,e),this}let b=Math.sqrt((m-x)*(m-x)+(d-g)*(d-g)+(u-h)*(u-h));return Math.abs(b)<.001&&(b=1),this.x=(m-x)/b,this.y=(d-g)/b,this.z=(u-h)/b,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Xt(this.x,t.x,e.x),this.y=Xt(this.y,t.y,e.y),this.z=Xt(this.z,t.z,e.z),this.w=Xt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Xt(this.x,t,e),this.y=Xt(this.y,t,e),this.z=Xt(this.z,t,e),this.w=Xt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Xt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Po=class extends kn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ve,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new me(0,0,t,e),this.scissorTest=!1,this.viewport=new me(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Pe(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Ve,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ls(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},ye=class extends Po{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Fr=class extends Pe{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Be,this.minFilter=Be,this.wrapR=Un,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Io=class extends Pe{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Be,this.minFilter=Be,this.wrapR=Un,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var ue=class i{static{i.prototype.isMatrix4=!0}constructor(t,e,n,s,r,a,o,l,c,h,d,u,f,x,g,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,d,u,f,x,g,m)}set(t,e,n,s,r,a,o,l,c,h,d,u,f,x,g,m){let p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=x,p[11]=g,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/ds.setFromMatrixColumn(t,0).length(),r=1/ds.setFromMatrixColumn(t,1).length(),a=1/ds.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=a*h,f=a*d,x=o*h,g=o*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+x*c,e[5]=u-g*c,e[9]=-o*l,e[2]=g-u*c,e[6]=x+f*c,e[10]=a*l}else if(t.order==="YXZ"){let u=l*h,f=l*d,x=c*h,g=c*d;e[0]=u+g*o,e[4]=x*o-f,e[8]=a*c,e[1]=a*d,e[5]=a*h,e[9]=-o,e[2]=f*o-x,e[6]=g+u*o,e[10]=a*l}else if(t.order==="ZXY"){let u=l*h,f=l*d,x=c*h,g=c*d;e[0]=u-g*o,e[4]=-a*d,e[8]=x+f*o,e[1]=f+x*o,e[5]=a*h,e[9]=g-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let u=a*h,f=a*d,x=o*h,g=o*d;e[0]=l*h,e[4]=x*c-f,e[8]=u*c+g,e[1]=l*d,e[5]=g*c+u,e[9]=f*c-x,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let u=a*l,f=a*c,x=o*l,g=o*c;e[0]=l*h,e[4]=g-u*d,e[8]=x*d+f,e[1]=d,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*d+x,e[10]=u-g*d}else if(t.order==="XZY"){let u=a*l,f=a*c,x=o*l,g=o*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+g,e[5]=a*h,e[9]=f*d-x,e[2]=x*d-f,e[6]=o*h,e[10]=g*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Qm,t,tg)}lookAt(t,e,n){let s=this.elements;return hn.subVectors(t,e),hn.lengthSq()===0&&(hn.z=1),hn.normalize(),li.crossVectors(n,hn),li.lengthSq()===0&&(Math.abs(n.z)===1?hn.x+=1e-4:hn.z+=1e-4,hn.normalize(),li.crossVectors(n,hn)),li.normalize(),Za.crossVectors(hn,li),s[0]=li.x,s[4]=Za.x,s[8]=hn.x,s[1]=li.y,s[5]=Za.y,s[9]=hn.y,s[2]=li.z,s[6]=Za.z,s[10]=hn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],x=n[2],g=n[6],m=n[10],p=n[14],b=n[3],C=n[7],M=n[11],w=n[15],S=s[0],A=s[4],y=s[8],T=s[12],R=s[1],U=s[5],F=s[9],B=s[13],P=s[2],O=s[6],W=s[10],Z=s[14],nt=s[3],q=s[7],Q=s[11],et=s[15];return r[0]=a*S+o*R+l*P+c*nt,r[4]=a*A+o*U+l*O+c*q,r[8]=a*y+o*F+l*W+c*Q,r[12]=a*T+o*B+l*Z+c*et,r[1]=h*S+d*R+u*P+f*nt,r[5]=h*A+d*U+u*O+f*q,r[9]=h*y+d*F+u*W+f*Q,r[13]=h*T+d*B+u*Z+f*et,r[2]=x*S+g*R+m*P+p*nt,r[6]=x*A+g*U+m*O+p*q,r[10]=x*y+g*F+m*W+p*Q,r[14]=x*T+g*B+m*Z+p*et,r[3]=b*S+C*R+M*P+w*nt,r[7]=b*A+C*U+M*O+w*q,r[11]=b*y+C*F+M*W+w*Q,r[15]=b*T+C*B+M*Z+w*et,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],x=t[3],g=t[7],m=t[11],p=t[15],b=l*f-c*u,C=o*f-c*d,M=o*u-l*d,w=a*f-c*h,S=a*u-l*h,A=a*d-o*h;return e*(g*b-m*C+p*M)-n*(x*b-m*w+p*S)+s*(x*C-g*w+p*A)-r*(x*M-g*S+m*A)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],x=t[12],g=t[13],m=t[14],p=t[15],b=e*o-n*a,C=e*l-s*a,M=e*c-r*a,w=n*l-s*o,S=n*c-r*o,A=s*c-r*l,y=h*g-d*x,T=h*m-u*x,R=h*p-f*x,U=d*m-u*g,F=d*p-f*g,B=u*p-f*m,P=b*B-C*F+M*U+w*R-S*T+A*y;if(P===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let O=1/P;return t[0]=(o*B-l*F+c*U)*O,t[1]=(s*F-n*B-r*U)*O,t[2]=(g*A-m*S+p*w)*O,t[3]=(u*S-d*A-f*w)*O,t[4]=(l*R-a*B-c*T)*O,t[5]=(e*B-s*R+r*T)*O,t[6]=(m*M-x*A-p*C)*O,t[7]=(h*A-u*M+f*C)*O,t[8]=(a*F-o*R+c*y)*O,t[9]=(n*R-e*F-r*y)*O,t[10]=(x*S-g*M+p*b)*O,t[11]=(d*M-h*S-f*b)*O,t[12]=(o*T-a*U-l*y)*O,t[13]=(e*U-n*T+s*y)*O,t[14]=(g*C-x*w-m*b)*O,t[15]=(h*w-d*C+u*b)*O,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,d=o+o,u=r*c,f=r*h,x=r*d,g=a*h,m=a*d,p=o*d,b=l*c,C=l*h,M=l*d,w=n.x,S=n.y,A=n.z;return s[0]=(1-(g+p))*w,s[1]=(f+M)*w,s[2]=(x-C)*w,s[3]=0,s[4]=(f-M)*S,s[5]=(1-(u+p))*S,s[6]=(m+b)*S,s[7]=0,s[8]=(x+C)*A,s[9]=(m-b)*A,s[10]=(1-(u+g))*A,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=ds.set(s[0],s[1],s[2]).length(),o=ds.set(s[4],s[5],s[6]).length(),l=ds.set(s[8],s[9],s[10]).length();r<0&&(a=-a),Sn.copy(this);let c=1/a,h=1/o,d=1/l;return Sn.elements[0]*=c,Sn.elements[1]*=c,Sn.elements[2]*=c,Sn.elements[4]*=h,Sn.elements[5]*=h,Sn.elements[6]*=h,Sn.elements[8]*=d,Sn.elements[9]*=d,Sn.elements[10]*=d,e.setFromRotationMatrix(Sn),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=En,l=!1){let c=this.elements,h=2*r/(e-t),d=2*r/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s),x,g;if(l)x=r/(a-r),g=a*r/(a-r);else if(o===En)x=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===Ps)x=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=En,l=!1){let c=this.elements,h=2/(e-t),d=2/(n-s),u=-(e+t)/(e-t),f=-(n+s)/(n-s),x,g;if(l)x=1/(a-r),g=a/(a-r);else if(o===En)x=-2/(a-r),g=-(a+r)/(a-r);else if(o===Ps)x=-1/(a-r),g=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},ds=new D,Sn=new ue,Qm=new D(0,0,0),tg=new D(1,1,1),li=new D,Za=new D,hn=new D,Id=new ue,Ld=new On,jn=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(Xt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Xt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Xt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Xt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Xt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Xt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Dt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Id.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Id,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ld.setFromEuler(this),this.setFromQuaternion(Ld,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};jn.DEFAULT_ORDER="XYZ";var Ds=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},eg=0,Dd=new D,fs=new On,Xn=new ue,qa=new D,Sr=new D,ng=new D,ig=new On,Nd=new D(1,0,0),Ud=new D(0,1,0),Fd=new D(0,0,1),kd={type:"added"},sg={type:"removed"},ps={type:"childadded",child:null},Yc={type:"childremoved",child:null},Ge=class i extends kn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:eg++}),this.uuid=pi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new D,e=new jn,n=new On,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ue},normalMatrix:{value:new Ut}}),this.matrix=new ue,this.matrixWorld=new ue,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ds,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return fs.setFromAxisAngle(t,e),this.quaternion.multiply(fs),this}rotateOnWorldAxis(t,e){return fs.setFromAxisAngle(t,e),this.quaternion.premultiply(fs),this}rotateX(t){return this.rotateOnAxis(Nd,t)}rotateY(t){return this.rotateOnAxis(Ud,t)}rotateZ(t){return this.rotateOnAxis(Fd,t)}translateOnAxis(t,e){return Dd.copy(t).applyQuaternion(this.quaternion),this.position.add(Dd.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Nd,t)}translateY(t){return this.translateOnAxis(Ud,t)}translateZ(t){return this.translateOnAxis(Fd,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Xn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?qa.copy(t):qa.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Sr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Xn.lookAt(Sr,qa,this.up):Xn.lookAt(qa,Sr,this.up),this.quaternion.setFromRotationMatrix(Xn),s&&(Xn.extractRotation(s.matrixWorld),fs.setFromRotationMatrix(Xn),this.quaternion.premultiply(fs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Lt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(kd),ps.child=t,this.dispatchEvent(ps),ps.child=null):Lt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(sg),Yc.child=t,this.dispatchEvent(Yc),Yc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Xn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Xn.multiply(t.parent.matrixWorld)),t.applyMatrix4(Xn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(kd),ps.child=t,this.dispatchEvent(ps),ps.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Sr,t,ng),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Sr,ig,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),d=a(t.shapes),u=a(t.skeletons),f=a(t.animations),x=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),x.length>0&&(n.nodes=x)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Ge.DEFAULT_UP=new D(0,1,0);Ge.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ge.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Re=class extends Ge{constructor(){super(),this.isGroup=!0,this.type="Group"}},rg={type:"move"},Ns=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Re,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Re,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Re,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let g of t.hand.values()){let m=e.getJointPose(g,n),p=this._getHandJoint(c,g);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,x=.005;c.inputState.pinching&&u>f+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(rg)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Re;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Of={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ci={h:0,s:0,l:0},$a={h:0,s:0,l:0};function Jc(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var At=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ae){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Ht.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Ht.workingColorSpace){return this.r=t,this.g=e,this.b=n,Ht.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Ht.workingColorSpace){if(t=Ym(t,1),e=Xt(e,0,1),n=Xt(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Jc(a,r,t+1/3),this.g=Jc(a,r,t),this.b=Jc(a,r,t-1/3)}return Ht.colorSpaceToWorking(this,s),this}setStyle(t,e=Ae){function n(r){r!==void 0&&parseFloat(r)<1&&Dt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Dt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);Dt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ae){let n=Of[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Dt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Kn(t.r),this.g=Kn(t.g),this.b=Kn(t.b),this}copyLinearToSRGB(t){return this.r=Cs(t.r),this.g=Cs(t.g),this.b=Cs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ae){return Ht.workingToColorSpace(Ye.copy(this),t),Math.round(Xt(Ye.r*255,0,255))*65536+Math.round(Xt(Ye.g*255,0,255))*256+Math.round(Xt(Ye.b*255,0,255))}getHexString(t=Ae){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Ht.workingColorSpace){Ht.workingToColorSpace(Ye.copy(this),e);let n=Ye.r,s=Ye.g,r=Ye.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let d=a-o;switch(c=h<=.5?d/(a+o):d/(2-a-o),a){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Ht.workingColorSpace){return Ht.workingToColorSpace(Ye.copy(this),e),t.r=Ye.r,t.g=Ye.g,t.b=Ye.b,t}getStyle(t=Ae){Ht.workingToColorSpace(Ye.copy(this),t);let e=Ye.r,n=Ye.g,s=Ye.b;return t!==Ae?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(ci),this.setHSL(ci.h+t,ci.s+e,ci.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(ci),t.getHSL($a);let n=Wc(ci.h,$a.h,e),s=Wc(ci.s,$a.s,e),r=Wc(ci.l,$a.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Ye=new At;At.NAMES=Of;var kr=class extends Ge{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new jn,this.environmentIntensity=1,this.environmentRotation=new jn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},wn=new D,Zn=new D,Kc=new D,qn=new D,ms=new D,gs=new D,Od=new D,jc=new D,Qc=new D,th=new D,eh=new me,nh=new me,ih=new me,Jn=class i{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),wn.subVectors(t,e),s.cross(wn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){wn.subVectors(s,e),Zn.subVectors(n,e),Kc.subVectors(t,e);let a=wn.dot(wn),o=wn.dot(Zn),l=wn.dot(Kc),c=Zn.dot(Zn),h=Zn.dot(Kc),d=a*c-o*o;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(c*l-o*h)*u,x=(a*h-o*l)*u;return r.set(1-f-x,x,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,qn)===null?!1:qn.x>=0&&qn.y>=0&&qn.x+qn.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,qn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,qn.x),l.addScaledVector(a,qn.y),l.addScaledVector(o,qn.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return eh.setScalar(0),nh.setScalar(0),ih.setScalar(0),eh.fromBufferAttribute(t,e),nh.fromBufferAttribute(t,n),ih.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(eh,r.x),a.addScaledVector(nh,r.y),a.addScaledVector(ih,r.z),a}static isFrontFacing(t,e,n,s){return wn.subVectors(n,e),Zn.subVectors(t,e),wn.cross(Zn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return wn.subVectors(this.c,this.b),Zn.subVectors(this.a,this.b),wn.cross(Zn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;ms.subVectors(s,n),gs.subVectors(r,n),jc.subVectors(t,n);let l=ms.dot(jc),c=gs.dot(jc);if(l<=0&&c<=0)return e.copy(n);Qc.subVectors(t,s);let h=ms.dot(Qc),d=gs.dot(Qc);if(h>=0&&d<=h)return e.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(ms,a);th.subVectors(t,r);let f=ms.dot(th),x=gs.dot(th);if(x>=0&&f<=x)return e.copy(r);let g=f*c-l*x;if(g<=0&&c>=0&&x<=0)return o=c/(c-x),e.copy(n).addScaledVector(gs,o);let m=h*x-f*d;if(m<=0&&d-h>=0&&f-x>=0)return Od.subVectors(r,s),o=(d-h)/(d-h+(f-x)),e.copy(s).addScaledVector(Od,o);let p=1/(m+g+u);return a=g*p,o=u*p,e.copy(n).addScaledVector(ms,a).addScaledVector(gs,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},mi=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Tn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Tn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Tn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Tn):Tn.fromBufferAttribute(r,a),Tn.applyMatrix4(t.matrixWorld),this.expandByPoint(Tn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ya.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ya.copy(n.boundingBox)),Ya.applyMatrix4(t.matrixWorld),this.union(Ya)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Tn),Tn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(wr),Ja.subVectors(this.max,wr),xs.subVectors(t.a,wr),_s.subVectors(t.b,wr),ys.subVectors(t.c,wr),hi.subVectors(_s,xs),di.subVectors(ys,_s),Ui.subVectors(xs,ys);let e=[0,-hi.z,hi.y,0,-di.z,di.y,0,-Ui.z,Ui.y,hi.z,0,-hi.x,di.z,0,-di.x,Ui.z,0,-Ui.x,-hi.y,hi.x,0,-di.y,di.x,0,-Ui.y,Ui.x,0];return!sh(e,xs,_s,ys,Ja)||(e=[1,0,0,0,1,0,0,0,1],!sh(e,xs,_s,ys,Ja))?!1:(Ka.crossVectors(hi,di),e=[Ka.x,Ka.y,Ka.z],sh(e,xs,_s,ys,Ja))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Tn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Tn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:($n[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),$n[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),$n[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),$n[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),$n[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),$n[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),$n[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),$n[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints($n),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},$n=[new D,new D,new D,new D,new D,new D,new D,new D],Tn=new D,Ya=new mi,xs=new D,_s=new D,ys=new D,hi=new D,di=new D,Ui=new D,wr=new D,Ja=new D,Ka=new D,Fi=new D;function sh(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Fi.fromArray(i,r);let o=s.x*Math.abs(Fi.x)+s.y*Math.abs(Fi.y)+s.z*Math.abs(Fi.z),l=t.dot(Fi),c=e.dot(Fi),h=n.dot(Fi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var Ee=new D,ja=new bt,ag=0,Oe=class extends kn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ag++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=kh,this.updateRanges=[],this.gpuType=Pn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)ja.fromBufferAttribute(this,e),ja.applyMatrix3(t),this.setXY(e,ja.x,ja.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyMatrix3(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyMatrix4(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyNormalMatrix(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.transformDirection(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Nn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=se(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Nn(e,this.array)),e}setX(t,e){return this.normalized&&(e=se(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Nn(e,this.array)),e}setY(t,e){return this.normalized&&(e=se(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Nn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=se(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Nn(e,this.array)),e}setW(t,e){return this.normalized&&(e=se(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=se(e,this.array),n=se(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=se(e,this.array),n=se(n,this.array),s=se(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=se(e,this.array),n=se(n,this.array),s=se(s,this.array),r=se(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Or=class extends Oe{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Br=class extends Oe{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var ee=class extends Oe{constructor(t,e,n){super(new Float32Array(t),e,n)}},og=new mi,Tr=new D,rh=new D,zi=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):og.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Tr.subVectors(t,this.center);let e=Tr.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Tr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(rh.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Tr.copy(t.center).add(rh)),this.expandByPoint(Tr.copy(t.center).sub(rh))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},lg=0,gn=new ue,ah=new Ge,vs=new D,un=new mi,Er=new mi,Fe=new D,_e=class i extends kn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:lg++}),this.uuid=pi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(qm(t)?Br:Or)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ut().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return gn.makeRotationFromQuaternion(t),this.applyMatrix4(gn),this}rotateX(t){return gn.makeRotationX(t),this.applyMatrix4(gn),this}rotateY(t){return gn.makeRotationY(t),this.applyMatrix4(gn),this}rotateZ(t){return gn.makeRotationZ(t),this.applyMatrix4(gn),this}translate(t,e,n){return gn.makeTranslation(t,e,n),this.applyMatrix4(gn),this}scale(t,e,n){return gn.makeScale(t,e,n),this.applyMatrix4(gn),this}lookAt(t){return ah.lookAt(t),ah.updateMatrix(),this.applyMatrix4(ah.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(vs).negate(),this.translate(vs.x,vs.y,vs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ee(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Dt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new mi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];un.setFromBufferAttribute(r),this.morphTargetsRelative?(Fe.addVectors(this.boundingBox.min,un.min),this.boundingBox.expandByPoint(Fe),Fe.addVectors(this.boundingBox.max,un.max),this.boundingBox.expandByPoint(Fe)):(this.boundingBox.expandByPoint(un.min),this.boundingBox.expandByPoint(un.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Lt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let n=this.boundingSphere.center;if(un.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];Er.setFromBufferAttribute(o),this.morphTargetsRelative?(Fe.addVectors(un.min,Er.min),un.expandByPoint(Fe),Fe.addVectors(un.max,Er.max),un.expandByPoint(Fe)):(un.expandByPoint(Er.min),un.expandByPoint(Er.max))}un.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)Fe.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Fe));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Fe.fromBufferAttribute(o,c),l&&(vs.fromBufferAttribute(t,c),Fe.add(vs)),s=Math.max(s,n.distanceToSquared(Fe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Lt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Lt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new Oe(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let y=0;y<n.count;y++)o[y]=new D,l[y]=new D;let c=new D,h=new D,d=new D,u=new bt,f=new bt,x=new bt,g=new D,m=new D;function p(y,T,R){c.fromBufferAttribute(n,y),h.fromBufferAttribute(n,T),d.fromBufferAttribute(n,R),u.fromBufferAttribute(r,y),f.fromBufferAttribute(r,T),x.fromBufferAttribute(r,R),h.sub(c),d.sub(c),f.sub(u),x.sub(u);let U=1/(f.x*x.y-x.x*f.y);isFinite(U)&&(g.copy(h).multiplyScalar(x.y).addScaledVector(d,-f.y).multiplyScalar(U),m.copy(d).multiplyScalar(f.x).addScaledVector(h,-x.x).multiplyScalar(U),o[y].add(g),o[T].add(g),o[R].add(g),l[y].add(m),l[T].add(m),l[R].add(m))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let y=0,T=b.length;y<T;++y){let R=b[y],U=R.start,F=R.count;for(let B=U,P=U+F;B<P;B+=3)p(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let C=new D,M=new D,w=new D,S=new D;function A(y){w.fromBufferAttribute(s,y),S.copy(w);let T=o[y];C.copy(T),C.sub(w.multiplyScalar(w.dot(T))).normalize(),M.crossVectors(S,T);let U=M.dot(l[y])<0?-1:1;a.setXYZW(y,C.x,C.y,C.z,U)}for(let y=0,T=b.length;y<T;++y){let R=b[y],U=R.start,F=R.count;for(let B=U,P=U+F;B<P;B+=3)A(t.getX(B+0)),A(t.getX(B+1)),A(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Oe(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new D,r=new D,a=new D,o=new D,l=new D,c=new D,h=new D,d=new D;if(t)for(let u=0,f=t.count;u<f;u+=3){let x=t.getX(u+0),g=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,g),a.fromBufferAttribute(e,m),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),o.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(x,o.x,o.y,o.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Fe.fromBufferAttribute(t,e),Fe.normalize(),t.setXYZ(e,Fe.x,Fe.y,Fe.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,d=o.normalized,u=new c.constructor(l.length*h),f=0,x=0;for(let g=0,m=l.length;g<m;g++){o.isInterleavedBufferAttribute?f=l[g]*o.data.stride+o.offset:f=l[g]*h;for(let p=0;p<h;p++)u[x++]=c[f++]}return new Oe(u,h,d)}if(this.index===null)return Dt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,n);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,d=c.length;h<d;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,h=a.length;c<h;c++){let d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},Lo=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=kh,this.updateRanges=[],this.version=0,this.uuid=pi()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=pi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=pi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},je=new D,zr=class i{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)je.fromBufferAttribute(this,e),je.applyMatrix4(t),this.setXYZ(e,je.x,je.y,je.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)je.fromBufferAttribute(this,e),je.applyNormalMatrix(t),this.setXYZ(e,je.x,je.y,je.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)je.fromBufferAttribute(this,e),je.transformDirection(t),this.setXYZ(e,je.x,je.y,je.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=Nn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=se(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=se(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=se(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=se(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=se(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=Nn(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=Nn(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=Nn(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=Nn(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=se(e,this.array),n=se(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=se(e,this.array),n=se(n,this.array),s=se(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=se(e,this.array),n=se(n,this.array),s=se(s,this.array),r=se(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){Nr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Oe(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new i(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){Nr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},oh=new D,cg=new D,hg=new Ut,Qe=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=oh.subVectors(n,e).cross(cg.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(oh),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||hg.getNormalMatrix(t),s=this.coplanarPoint(oh).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},ug=0,An=class extends kn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ug++}),this.uuid=pi(),this.name="",this.type="Material",this.blending=bi,this.side=Mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Eh,this.blendDst=Ah,this.blendEquation=Wi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new At(0,0,0),this.blendAlpha=0,this.depthFunc=Rs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Af,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=_o,this.stencilZFail=_o,this.stencilZPass=_o,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Dt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Dt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new At().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Qe().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new bt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new bt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Cn=class extends An{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new At(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Ms,Ar=new D,bs=new D,Ss=new D,ws=new bt,Cr=new bt,Bf=new ue,Qa=new D,Rr=new D,to=new D,Bd=new bt,lh=new bt,zd=new bt,Bn=class extends Ge{constructor(t=new Cn){if(super(),this.isSprite=!0,this.type="Sprite",Ms===void 0){Ms=new _e;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Lo(e,5);Ms.setIndex([0,1,2,0,2,3]),Ms.setAttribute("position",new zr(n,3,0,!1)),Ms.setAttribute("uv",new zr(n,2,3,!1))}this.geometry=Ms,this.material=t,this.center=new bt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Lt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),bs.setFromMatrixScale(this.matrixWorld),Bf.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Ss.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&bs.multiplyScalar(-Ss.z);let n=this.material.rotation,s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));let a=this.center;eo(Qa.set(-.5,-.5,0),Ss,a,bs,s,r),eo(Rr.set(.5,-.5,0),Ss,a,bs,s,r),eo(to.set(.5,.5,0),Ss,a,bs,s,r),Bd.set(0,0),lh.set(1,0),zd.set(1,1);let o=t.ray.intersectTriangle(Qa,Rr,to,!1,Ar);if(o===null&&(eo(Rr.set(-.5,.5,0),Ss,a,bs,s,r),lh.set(0,1),o=t.ray.intersectTriangle(Qa,to,Rr,!1,Ar),o===null))return;let l=t.ray.origin.distanceTo(Ar);l<t.near||l>t.far||e.push({distance:l,point:Ar.clone(),uv:Jn.getInterpolation(Ar,Qa,Rr,to,Bd,lh,zd,new bt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function eo(i,t,e,n,s,r){ws.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(Cr.x=r*ws.x-s*ws.y,Cr.y=s*ws.x+r*ws.y):Cr.copy(ws),i.copy(t),i.x+=Cr.x,i.y+=Cr.y,i.applyMatrix4(Bf)}var Yn=new D,ch=new D,no=new D,io=new D,Us=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Yn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Yn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Yn.copy(this.origin).addScaledVector(this.direction,e),Yn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){ch.copy(t).add(e).multiplyScalar(.5),no.copy(e).sub(t).normalize(),io.copy(this.origin).sub(ch);let r=t.distanceTo(e)*.5,a=-this.direction.dot(no),o=io.dot(this.direction),l=-io.dot(no),c=io.lengthSq(),h=Math.abs(1-a*a),d,u,f,x;if(h>0)if(d=a*l-o,u=a*o-l,x=r*h,d>=0)if(u>=-x)if(u<=x){let g=1/h;d*=g,u*=g,f=d*(d+a*u+2*o)+u*(a*d+u+2*l)+c}else u=r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u<=-x?(d=Math.max(0,-(-a*r+o)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=x?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(a*r+o)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=a>0?-r:r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(ch).addScaledVector(no,u),f}intersectSphere(t,e){if(t.radius<0)return null;Yn.subVectors(t.center,this.origin);let n=Yn.dot(this.direction),s=Yn.dot(Yn)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),d>=0?(o=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(o=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Yn)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,d=t.x-a.x,u=t.y-a.y,f=t.z-a.z,x=e.x-a.x,g=e.y-a.y,m=e.z-a.z,p=n.x-a.x,b=n.y-a.y,C=n.z-a.z,M=Math.abs(l),w=Math.abs(c),S=Math.abs(h),A,y,T,R,U,F,B,P,O,W,Z,nt;if(M>=w&&M>=S?(T=l,F=d,O=x,nt=p,l>=0?(A=c,y=h,R=u,U=f,B=g,P=m,W=b,Z=C):(A=h,y=c,R=f,U=u,B=m,P=g,W=C,Z=b)):w>=S?(T=c,F=u,O=g,nt=b,c>=0?(A=h,y=l,R=f,U=d,B=m,P=x,W=C,Z=p):(A=l,y=h,R=d,U=f,B=x,P=m,W=p,Z=C)):(T=h,F=f,O=m,nt=C,h>=0?(A=l,y=c,R=d,U=u,B=x,P=g,W=p,Z=b):(A=c,y=l,R=u,U=d,B=g,P=x,W=b,Z=p)),T===0)return null;let q=A/T,Q=y/T,et=1/T,Pt=R-q*F,Ct=U-Q*F,oe=B-q*O,Zt=P-Q*O,Kt=W-q*nt,$=Z-Q*nt,j=Kt*Zt-$*oe,yt=Pt*$-Ct*Kt,Ft=oe*Ct-Zt*Pt;if(s){if(j<0||yt<0||Ft<0)return null}else if((j<0||yt<0||Ft<0)&&(j>0||yt>0||Ft>0))return null;let gt=j+yt+Ft;if(gt===0)return null;let zt=et*(j*F+yt*O+Ft*nt);return(gt>0?zt<0:zt>0)?null:this.at(zt/gt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},be=class extends An{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new At(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new jn,this.combine=Ch,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Hd=new ue,ki=new Us,so=new zi,Vd=new D,ro=new D,ao=new D,oo=new D,hh=new D,lo=new D,Gd=new D,co=new D,Nt=class extends Ge{constructor(t=new _e,e=new be){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){lo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],d=r[l];h!==0&&(hh.fromBufferAttribute(d,t),a?lo.addScaledVector(hh,h):lo.addScaledVector(hh.sub(e),h))}e.add(lo)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),so.copy(n.boundingSphere),so.applyMatrix4(r),ki.copy(t.ray).recast(t.near),!(so.containsPoint(ki.origin)===!1&&(ki.intersectSphere(so,Vd)===null||ki.origin.distanceToSquared(Vd)>(t.far-t.near)**2))&&(Hd.copy(r).invert(),ki.copy(t.ray).applyMatrix4(Hd),!(n.boundingBox!==null&&ki.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ki)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let x=0,g=u.length;x<g;x++){let m=u[x],p=a[m.materialIndex],b=Math.max(m.start,f.start),C=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let M=b,w=C;M<w;M+=3){let S=o.getX(M),A=o.getX(M+1),y=o.getX(M+2);s=ho(this,p,t,n,c,h,d,S,A,y),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(o.count,f.start+f.count);for(let m=x,p=g;m<p;m+=3){let b=o.getX(m),C=o.getX(m+1),M=o.getX(m+2);s=ho(this,a,t,n,c,h,d,b,C,M),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let x=0,g=u.length;x<g;x++){let m=u[x],p=a[m.materialIndex],b=Math.max(m.start,f.start),C=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let M=b,w=C;M<w;M+=3){let S=M,A=M+1,y=M+2;s=ho(this,p,t,n,c,h,d,S,A,y),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let m=x,p=g;m<p;m+=3){let b=m,C=m+1,M=m+2;s=ho(this,a,t,n,c,h,d,b,C,M),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}};function dg(i,t,e,n,s,r,a,o){let l;if(t.side===tn?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===Mi,o),l===null)return null;co.copy(o),co.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(co);return c<e.near||c>e.far?null:{distance:c,point:co.clone(),object:i}}function ho(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,ro),i.getVertexPosition(l,ao),i.getVertexPosition(c,oo);let h=dg(i,t,e,n,ro,ao,oo,Gd);if(h){let d=new D;Jn.getBarycoord(Gd,ro,ao,oo,d),s&&(h.uv=Jn.getInterpolatedAttribute(s,o,l,c,d,new bt)),r&&(h.uv1=Jn.getInterpolatedAttribute(r,o,l,c,d,new bt)),a&&(h.normal=Jn.getInterpolatedAttribute(a,o,l,c,d,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new D,materialIndex:0};Jn.getNormal(ro,ao,oo,u.normal),h.face=u,h.barycoord=d}return h}var Do=class extends Pe{constructor(t=null,e=1,n=1,s,r,a,o,l,c=Be,h=Be,d,u){super(null,a,o,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Oi=new zi,fg=new bt(.5,.5),uo=new D,Fs=class{constructor(t=new Qe,e=new Qe,n=new Qe,s=new Qe,r=new Qe,a=new Qe){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=En,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],x=r[8],g=r[9],m=r[10],p=r[11],b=r[12],C=r[13],M=r[14],w=r[15];if(s[0].setComponents(c-a,f-h,p-x,w-b).normalize(),s[1].setComponents(c+a,f+h,p+x,w+b).normalize(),s[2].setComponents(c+o,f+d,p+g,w+C).normalize(),s[3].setComponents(c-o,f-d,p-g,w-C).normalize(),n)s[4].setComponents(l,u,m,M).normalize(),s[5].setComponents(c-l,f-u,p-m,w-M).normalize();else if(s[4].setComponents(c-l,f-u,p-m,w-M).normalize(),e===En)s[5].setComponents(c+l,f+u,p+m,w+M).normalize();else if(e===Ps)s[5].setComponents(l,u,m,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Oi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Oi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Oi)}intersectsSprite(t){Oi.center.set(0,0,0);let e=fg.distanceTo(t.center);return Oi.radius=.7071067811865476+e,Oi.applyMatrix4(t.matrixWorld),this.intersectsSphere(Oi)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(uo.x=s.normal.x>0?t.max.x:t.min.x,uo.y=s.normal.y>0?t.max.y:t.min.y,uo.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(uo)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var gi=class extends An{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new At(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Wd=new ue,xh=new Us,fo=new zi,po=new D,Hi=class extends Ge{constructor(t=new _e,e=new gi){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),fo.copy(n.boundingSphere),fo.applyMatrix4(s),fo.radius+=r,t.ray.intersectsSphere(fo)===!1)return;Wd.copy(s).invert(),xh.copy(t.ray).applyMatrix4(Wd);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=n.index,d=n.attributes.position;if(c!==null){let u=Math.max(0,a.start),f=Math.min(c.count,a.start+a.count);for(let x=u,g=f;x<g;x++){let m=c.getX(x);po.fromBufferAttribute(d,m),Xd(po,m,l,s,t,e,this)}}else{let u=Math.max(0,a.start),f=Math.min(d.count,a.start+a.count);for(let x=u,g=f;x<g;x++)po.fromBufferAttribute(d,x),Xd(po,x,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Xd(i,t,e,n,s,r,a){let o=xh.distanceSqToPoint(i);if(o<e){let l=new D;xh.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:a})}}var Hr=class extends Pe{constructor(t=[],e=Si,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Vr=class extends Pe{constructor(t,e,n,s,r,a,o,l,c){super(t,e,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var xi=class extends Pe{constructor(t,e,n=Rn,s,r,a,o=Be,l=Be,c,h=Fn,d=1){if(h!==Fn&&h!==wi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ls(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},No=class extends xi{constructor(t,e=Rn,n=Si,s,r,a=Be,o=Be,l,c=Fn){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},Gr=class extends Pe{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},We=class i extends _e{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],d=[],u=0,f=0;x("z","y","x",-1,-1,n,e,t,a,r,0),x("z","y","x",1,-1,n,e,-t,a,r,1),x("x","z","y",1,1,t,n,e,s,a,2),x("x","z","y",1,-1,t,n,-e,s,a,3),x("x","y","z",1,-1,t,e,n,s,r,4),x("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ee(c,3)),this.setAttribute("normal",new ee(h,3)),this.setAttribute("uv",new ee(d,2));function x(g,m,p,b,C,M,w,S,A,y,T){let R=M/A,U=w/y,F=M/2,B=w/2,P=S/2,O=A+1,W=y+1,Z=0,nt=0,q=new D;for(let Q=0;Q<W;Q++){let et=Q*U-B;for(let Pt=0;Pt<O;Pt++){let Ct=Pt*R-F;q[g]=Ct*b,q[m]=et*C,q[p]=P,c.push(q.x,q.y,q.z),q[g]=0,q[m]=0,q[p]=S>0?1:-1,h.push(q.x,q.y,q.z),d.push(Pt/A),d.push(1-Q/y),Z+=1}}for(let Q=0;Q<y;Q++)for(let et=0;et<A;et++){let Pt=u+et+O*Q,Ct=u+et+O*(Q+1),oe=u+(et+1)+O*(Q+1),Zt=u+(et+1)+O*Q;l.push(Pt,Ct,Zt),l.push(Ct,oe,Zt),nt+=6}o.addGroup(f,nt,T),f+=nt,u+=Z}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Wr=class i extends _e{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],a=[],o=[],l=[],c=new D,h=new bt;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){let f=n+d/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),a.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(a[u]/t+1)/2,h.y=(a[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new ee(a,3)),this.setAttribute("normal",new ee(o,3)),this.setAttribute("uv",new ee(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},zn=class i extends _e{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],d=[],u=[],f=[],x=0,g=[],m=n/2,p=0;b(),a===!1&&(t>0&&C(!0),e>0&&C(!1)),this.setIndex(h),this.setAttribute("position",new ee(d,3)),this.setAttribute("normal",new ee(u,3)),this.setAttribute("uv",new ee(f,2));function b(){let M=new D,w=new D,S=0,A=(e-t)/n;for(let y=0;y<=r;y++){let T=[],R=y/r,U=R*(e-t)+t;for(let F=0;F<=s;F++){let B=F/s,P=B*l+o,O=Math.sin(P),W=Math.cos(P);w.x=U*O,w.y=-R*n+m,w.z=U*W,d.push(w.x,w.y,w.z),M.set(O,A,W).normalize(),u.push(M.x,M.y,M.z),f.push(B,1-R),T.push(x++)}g.push(T)}for(let y=0;y<s;y++)for(let T=0;T<r;T++){let R=g[T][y],U=g[T+1][y],F=g[T+1][y+1],B=g[T][y+1];(t>0||T!==0)&&(h.push(R,U,B),S+=3),(e>0||T!==r-1)&&(h.push(U,F,B),S+=3)}c.addGroup(p,S,0),p+=S}function C(M){let w=x,S=new bt,A=new D,y=0,T=M===!0?t:e,R=M===!0?1:-1;for(let F=1;F<=s;F++)d.push(0,m*R,0),u.push(0,R,0),f.push(.5,.5),x++;let U=x;for(let F=0;F<=s;F++){let P=F/s*l+o,O=Math.cos(P),W=Math.sin(P);A.x=T*W,A.y=m*R,A.z=T*O,d.push(A.x,A.y,A.z),u.push(0,R,0),S.x=O*.5+.5,S.y=W*.5*R+.5,f.push(S.x,S.y),x++}for(let F=0;F<s;F++){let B=w+F,P=U+F;M===!0?h.push(P,P+1,B):h.push(P+1,P,B),y+=3}c.addGroup(p,y,M===!0?1:2),p+=y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Ie=class i extends _e{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,d=t/o,u=e/l,f=[],x=[],g=[],m=[];for(let p=0;p<h;p++){let b=p*u-a;for(let C=0;C<c;C++){let M=C*d-r;x.push(M,-b,0),g.push(0,0,1),m.push(C/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let b=0;b<o;b++){let C=b+c*p,M=b+c*(p+1),w=b+1+c*(p+1),S=b+1+c*p;f.push(C,M,S),f.push(M,w,S)}this.setIndex(f),this.setAttribute("position",new ee(x,3)),this.setAttribute("normal",new ee(g,3)),this.setAttribute("uv",new ee(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var Xr=class i extends _e{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],d=new D,u=new D,f=[],x=[],g=[],m=[];for(let p=0;p<=n;p++){let b=[],C=p/n,M=a+C*o,w=t*Math.cos(M),S=Math.sqrt(t*t-w*w),A=0;p===0&&a===0?A=.5/e:p===n&&l===Math.PI&&(A=-.5/e);for(let y=0;y<=e;y++){let T=y/e,R=s+T*r;d.x=-S*Math.cos(R),d.y=w,d.z=S*Math.sin(R),x.push(d.x,d.y,d.z),u.copy(d).normalize(),g.push(u.x,u.y,u.z),m.push(T+A,1-C),b.push(c++)}h.push(b)}for(let p=0;p<n;p++)for(let b=0;b<e;b++){let C=h[p][b+1],M=h[p][b],w=h[p+1][b],S=h[p+1][b+1];(p!==0||a>0)&&f.push(C,M,S),(p!==n-1||l<Math.PI)&&f.push(M,w,S)}this.setIndex(f),this.setAttribute("position",new ee(x,3)),this.setAttribute("normal",new ee(g,3)),this.setAttribute("uv",new ee(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var ks=class i extends _e{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:a,thetaLength:o},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],d=[],u=new D,f=new D,x=new D;for(let g=0;g<=n;g++){let m=a+g/n*o;for(let p=0;p<=s;p++){let b=p/s*r;f.x=(t+e*Math.cos(m))*Math.cos(b),f.y=(t+e*Math.cos(m))*Math.sin(b),f.z=e*Math.sin(m),c.push(f.x,f.y,f.z),u.x=t*Math.cos(b),u.y=t*Math.sin(b),x.subVectors(f,u).normalize(),h.push(x.x,x.y,x.z),d.push(p/s),d.push(g/n)}}for(let g=1;g<=n;g++)for(let m=1;m<=s;m++){let p=(s+1)*g+m-1,b=(s+1)*(g-1)+m-1,C=(s+1)*(g-1)+m,M=(s+1)*g+m;l.push(p,b,M),l.push(b,C,M)}this.setIndex(l),this.setAttribute("position",new ee(c,3)),this.setAttribute("normal",new ee(h,3)),this.setAttribute("uv",new ee(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var Os=class extends An{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new At(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function Zi(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(Zd(s))s.isRenderTargetTexture?(Dt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Zd(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Je(i){let t={};for(let e=0;e<i.length;e++){let n=Zi(i[e]);for(let s in n)t[s]=n[s]}return t}function Zd(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function pg(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Bh(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ht.workingColorSpace}var ti={clone:Zi,merge:Je},mg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,gg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Se=class extends An{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=mg,this.fragmentShader=gg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Zi(t.uniforms),this.uniformsGroups=pg(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new At().setHex(s.value);break;case"v2":this.uniforms[n].value=new bt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new D().fromArray(s.value);break;case"v4":this.uniforms[n].value=new me().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ut().fromArray(s.value);break;case"m4":this.uniforms[n].value=new ue().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Bs=class extends Se{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Xe=class extends An{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new At(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new At(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Dl,this.normalScale=new bt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new jn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},zs=class extends Xe{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new bt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Xt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new At(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new At(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new At(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var Uo=class extends An{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Tf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Fo=class extends An{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Ts(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function uh(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var _i=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},ko=class extends _i{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ph,endingEnd:ph}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case mh:r=t,o=2*e-n;break;case gh:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case mh:a=t,l=2*n-e;break;case gh:a=1,l=n+s[1]-s[0];break;default:a=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,x=(n-e)/(s-e),g=x*x,m=g*x,p=-u*m+2*u*g-u*x,b=(1+u)*m+(-1.5-2*u)*g+(-.5+u)*x+1,C=(-1-f)*m+(1.5+f)*g+.5*x,M=f*m-f*g;for(let w=0;w!==o;++w)r[w]=p*a[h+w]+b*a[c+w]+C*a[l+w]+M*a[d+w];return r}},Oo=class extends _i{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(n-e)/(s-e),d=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*d+a[l+u]*h;return r}},Bo=class extends _i{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},zo=class extends _i{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this.inTangents,d=this.outTangents;if(!h||!d){let x=(n-e)/(s-e),g=1-x;for(let m=0;m!==o;++m)r[m]=a[c+m]*g+a[l+m]*x;return r}let u=o*2,f=t-1;for(let x=0;x!==o;++x){let g=a[c+x],m=a[l+x],p=f*u+x*2,b=d[p],C=d[p+1],M=t*u+x*2,w=h[M],S=h[M+1],A=_g(n,e,b,w,s);r[x]=zf(A,g,C,S,m)}return r}};function zf(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function xg(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function _g(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=zf(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let l=xg(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var dn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Ts(e,this.TimeBufferType),this.values=Ts(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Ts(t.times,Array),values:Ts(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),uh(t.settings)&&(n.settings={inTangents:Ts(t.settings.inTangents,Array),outTangents:Ts(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Bo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Oo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new ko(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new zo(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Pr:e=this.InterpolantFactoryMethodDiscrete;break;case Co:e=this.InterpolantFactoryMethodLinear;break;case xo:e=this.InterpolantFactoryMethodSmooth;break;case fh:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Dt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Pr;case this.InterpolantFactoryMethodLinear:return Co;case this.InterpolantFactoryMethodSmooth:return xo;case this.InterpolantFactoryMethodBezier:return fh}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;uh(this.settings)&&(qd(this.settings.inTangents,t),qd(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Lt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Lt("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){Lt("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){Lt("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&$m(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){Lt("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===xo,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(s)l=!0;else{let d=o*n,u=d-n,f=d+n;for(let x=0;x!==n;++x){let g=e[d+x];if(g!==e[u+x]||g!==e[f+x]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let d=o*n,u=a*n;for(let f=0;f!==n;++f)e[u+f]=e[d+f]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,uh(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function qd(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}dn.prototype.ValueTypeName="";dn.prototype.TimeBufferType=Float32Array;dn.prototype.ValueBufferType=Float32Array;dn.prototype.DefaultInterpolation=Co;var yi=class extends dn{constructor(t,e,n){super(t,e,n)}};yi.prototype.ValueTypeName="bool";yi.prototype.ValueBufferType=Array;yi.prototype.DefaultInterpolation=Pr;yi.prototype.InterpolantFactoryMethodLinear=void 0;yi.prototype.InterpolantFactoryMethodSmooth=void 0;var Ho=class extends dn{constructor(t,e,n,s){super(t,e,n,s)}};Ho.prototype.ValueTypeName="color";var Vo=class extends dn{constructor(t,e,n,s){super(t,e,n,s)}};Vo.prototype.ValueTypeName="number";var Go=class extends _i{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-e)/(s-e),c=t*o;for(let h=c+o;c!==h;c+=4)On.slerpFlat(r,0,a,c-o,a,c,l);return r}},Zr=class extends dn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Go(this.times,this.values,this.getValueSize(),t)}};Zr.prototype.ValueTypeName="quaternion";Zr.prototype.InterpolantFactoryMethodSmooth=void 0;var vi=class extends dn{constructor(t,e,n){super(t,e,n)}};vi.prototype.ValueTypeName="string";vi.prototype.ValueBufferType=Array;vi.prototype.DefaultInterpolation=Pr;vi.prototype.InterpolantFactoryMethodLinear=void 0;vi.prototype.InterpolantFactoryMethodSmooth=void 0;var Wo=class extends dn{constructor(t,e,n,s){super(t,e,n,s)}};Wo.prototype.ValueTypeName="vector";var Xo=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let f=c[d],x=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Hf=new Xo,Zo=class{constructor(t){this.manager=t!==void 0?t:Hf,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Zo.DEFAULT_MATERIAL_NAME="__DEFAULT";var Hs=class extends Ge{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new At(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var dh=new ue,$d=new D,Yd=new D,qr=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new bt(512,512),this.mapType=on,this.map=null,this.mapPass=null,this.matrix=new ue,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fs,this._frameExtents=new bt(1,1),this._viewportCount=1,this._viewports=[new me(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;$d.setFromMatrixPosition(t.matrixWorld),e.position.copy($d),Yd.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Yd),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){dh.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(dh,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Ps||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(dh)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},mo=new D,go=new On,Dn=new D,$r=class extends Ge{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ue,this.projectionMatrix=new ue,this.projectionMatrixInverse=new ue,this.coordinateSystem=En,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(mo,go,Dn),Dn.x===1&&Dn.y===1&&Dn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(mo,go,Dn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(mo,go,Dn),Dn.x===1&&Dn.y===1&&Dn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(mo,go,Dn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},fi=new D,Jd=new bt,Kd=new bt,ke=class extends $r{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Ur*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Gc*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ur*2*Math.atan(Math.tan(Gc*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){fi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(fi.x,fi.y).multiplyScalar(-t/fi.z),fi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(fi.x,fi.y).multiplyScalar(-t/fi.z)}getViewSize(t,e){return this.getViewBounds(t,Jd,Kd),e.subVectors(Kd,Jd)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Gc*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},_h=class extends qr{constructor(){super(new ke(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,n=Ur*2*t.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(n!==e.fov||s!==e.aspect||r!==e.far)&&(e.fov=n,e.aspect=s,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},Vs=class extends Hs{constructor(t,e,n=0,s=Math.PI/3,r=0,a=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Ge.DEFAULT_UP),this.updateMatrix(),this.target=new Ge,this.distance=n,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new _h}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},yh=class extends qr{constructor(){super(new ke(90,1,.5,500)),this.isPointLightShadow=!0}},Yr=class extends Hs{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new yh}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Vi=class extends $r{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var Jr=class extends Hs{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Es=-90,As=1,qo=class extends Ge{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new ke(Es,As,t,e);s.layers=this.layers,this.add(s);let r=new ke(Es,As,t,e);r.layers=this.layers,this.add(r);let a=new ke(Es,As,t,e);a.layers=this.layers,this.add(a);let o=new ke(Es,As,t,e);o.layers=this.layers,this.add(o);let l=new ke(Es,As,t,e);l.layers=this.layers,this.add(l);let c=new ke(Es,As,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===En)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Ps)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=g,t.setRenderTarget(n,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=x,n.texture.needsPMREMUpdate=!0}},$o=class extends ke{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},Kr=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=yg.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function yg(){this._document.hidden===!1&&this.reset()}var zh="\\[\\]\\.:\\/",vg=new RegExp("["+zh+"]","g"),Hh="[^"+zh+"]",Mg="[^"+zh.replace("\\.","")+"]",bg=/((?:WC+[\/:])*)/.source.replace("WC",Hh),Sg=/(WCOD+)?/.source.replace("WCOD",Mg),wg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Hh),Tg=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Hh),Eg=new RegExp("^"+bg+Sg+wg+Tg+"$"),Ag=["material","materials","bones","map"],vh=class{constructor(t,e,n){let s=n||fe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},fe=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(vg,"")}static parseTrackName(t){let e=Eg.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Ag.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=n(o.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Dt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Lt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Lt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Lt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Lt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Lt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Lt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Lt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;Lt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Lt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Lt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};fe.Composite=vh;fe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};fe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};fe.prototype.GetterByBindingType=[fe.prototype._getValue_direct,fe.prototype._getValue_array,fe.prototype._getValue_arrayElement,fe.prototype._getValue_toArray];fe.prototype.SetterByBindingTypeAndVersioning=[[fe.prototype._setValue_direct,fe.prototype._setValue_direct_setNeedsUpdate,fe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_array,fe.prototype._setValue_array_setNeedsUpdate,fe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_arrayElement,fe.prototype._setValue_arrayElement_setNeedsUpdate,fe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[fe.prototype._setValue_fromArray,fe.prototype._setValue_fromArray_setNeedsUpdate,fe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var DM=new Float32Array(1);var jd=new ue,jr=class{constructor(t,e,n=0,s=1/0){this.ray=new Us(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Ds,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Lt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return jd.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(jd),this}intersectObject(t,e=!0,n=[]){return Mh(t,this,n,e),n.sort(Qd),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Mh(t[s],this,n,e);return n.sort(Qd),n}};function Qd(i,t){return i.distance-t.distance}function Mh(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)Mh(r[a],t,e,!0)}}var bh=class i{static{i.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};function Vh(i,t,e,n){let s=Cg(n);switch(e){case Nh:return i*t;case Fh:return i*t/s.components*s.byteLength;case tl:return i*t/s.components*s.byteLength;case Ti:return i*t*2/s.components*s.byteLength;case el:return i*t*2/s.components*s.byteLength;case Uh:return i*t*3/s.components*s.byteLength;case yn:return i*t*4/s.components*s.byteLength;case nl:return i*t*4/s.components*s.byteLength;case la:case ca:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ha:case ua:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case sl:case al:return Math.max(i,16)*Math.max(t,8)/4;case il:case rl:return Math.max(i,8)*Math.max(t,8)/2;case ol:case ll:case hl:case ul:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case cl:case da:case dl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case fl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case pl:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case ml:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case gl:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case xl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case _l:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case yl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case vl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Ml:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case bl:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Sl:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case wl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Tl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case El:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Al:case Cl:case Rl:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Pl:case Il:return Math.ceil(i/4)*Math.ceil(t/4)*8;case fa:case Ll:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Cg(i){switch(i){case on:case Ph:return{byteLength:1,components:1};case Xs:case Ih:case Le:return{byteLength:2,components:1};case jo:case Qo:return{byteLength:2,components:4};case Rn:case Ko:case Pn:return{byteLength:4,components:1};case Lh:case Dh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Dt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function cp(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Pg(i){let t=new WeakMap;function e(o,l){let c=o.array,h=o.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,o),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,x)=>f.start-x.start);let u=0;for(let f=1;f<d.length;f++){let x=d[u],g=d[f];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++u,d[u]=g)}d.length=u+1;for(let f=0,x=d.length;f<x;f++){let g=d[f];i.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Ig=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Lg=`#ifdef USE_ALPHAHASH
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
#endif`,Dg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ng=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Ug=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Fg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,kg=`#ifdef USE_AOMAP
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
#endif`,Og=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Bg=`#ifdef USE_BATCHING
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
#endif`,zg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Hg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Vg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Gg=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Wg=`#ifdef USE_IRIDESCENCE
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
#endif`,Xg=`#ifdef USE_BUMPMAP
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
#endif`,Zg=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,qg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,$g=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Yg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Jg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Kg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,jg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Qg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,t0=`#define PI 3.141592653589793
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
} // validated`,e0=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,n0=`vec3 transformedNormal = objectNormal;
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
#endif`,i0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,s0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,r0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,a0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,o0="gl_FragColor = linearToOutputTexel( gl_FragColor );",l0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,c0=`#ifdef USE_ENVMAP
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
#endif`,h0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,u0=`#ifdef USE_ENVMAP
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
#endif`,d0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,f0=`#ifdef USE_ENVMAP
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
#endif`,p0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,m0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,g0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,x0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,_0=`#ifdef USE_GRADIENTMAP
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
}`,y0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,v0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,M0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,b0=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,S0=`#ifdef USE_ENVMAP
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
#endif`,w0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,T0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,E0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,A0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,C0=`PhysicalMaterial material;
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
#endif`,R0=`uniform sampler2D dfgLUT;
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
}`,P0=`
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
#endif`,I0=`#if defined( RE_IndirectDiffuse )
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
#endif`,L0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,D0=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,N0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,U0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,F0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,k0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,O0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,B0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,z0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,H0=`#if defined( USE_POINTS_UV )
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
#endif`,V0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,G0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,W0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,X0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Z0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,q0=`#ifdef USE_MORPHTARGETS
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
#endif`,$0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Y0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,J0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,K0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,j0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Q0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,tx=`#ifdef USE_NORMALMAP
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
#endif`,ex=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,nx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ix=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,rx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ax=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ox=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,lx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,cx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ux=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,dx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fx=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,px=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,mx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,gx=`float getShadowMask() {
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
}`,xx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,_x=`#ifdef USE_SKINNING
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
#endif`,yx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,vx=`#ifdef USE_SKINNING
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
#endif`,Mx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Sx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wx=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Tx=`#ifdef USE_TRANSMISSION
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
#endif`,Ex=`#ifdef USE_TRANSMISSION
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
#endif`,Ax=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Cx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Px=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Ix=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Lx=`uniform sampler2D t2D;
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
}`,Dx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Nx=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Ux=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Fx=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,kx=`#include <common>
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
}`,Ox=`#if DEPTH_PACKING == 3200
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
}`,Bx=`#define DISTANCE
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
}`,zx=`#define DISTANCE
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
}`,Hx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Vx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Gx=`uniform float scale;
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
}`,Wx=`uniform vec3 diffuse;
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
}`,Xx=`#include <common>
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
}`,Zx=`uniform vec3 diffuse;
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
}`,qx=`#define LAMBERT
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
}`,$x=`#define LAMBERT
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
}`,Yx=`#define MATCAP
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
}`,Jx=`#define MATCAP
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
}`,Kx=`#define NORMAL
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
}`,jx=`#define NORMAL
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
}`,Qx=`#define PHONG
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
}`,t_=`#define PHONG
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
}`,e_=`#define STANDARD
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
}`,n_=`#define STANDARD
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
}`,i_=`#define TOON
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
}`,s_=`#define TOON
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
}`,r_=`uniform float size;
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
}`,a_=`uniform vec3 diffuse;
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
}`,o_=`#include <common>
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
}`,l_=`uniform vec3 color;
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
}`,c_=`uniform float rotation;
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
}`,h_=`uniform vec3 diffuse;
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
}`,Bt={alphahash_fragment:Ig,alphahash_pars_fragment:Lg,alphamap_fragment:Dg,alphamap_pars_fragment:Ng,alphatest_fragment:Ug,alphatest_pars_fragment:Fg,aomap_fragment:kg,aomap_pars_fragment:Og,batching_pars_vertex:Bg,batching_vertex:zg,begin_vertex:Hg,beginnormal_vertex:Vg,bsdfs:Gg,iridescence_fragment:Wg,bumpmap_pars_fragment:Xg,clipping_planes_fragment:Zg,clipping_planes_pars_fragment:qg,clipping_planes_pars_vertex:$g,clipping_planes_vertex:Yg,color_fragment:Jg,color_pars_fragment:Kg,color_pars_vertex:jg,color_vertex:Qg,common:t0,cube_uv_reflection_fragment:e0,defaultnormal_vertex:n0,displacementmap_pars_vertex:i0,displacementmap_vertex:s0,emissivemap_fragment:r0,emissivemap_pars_fragment:a0,colorspace_fragment:o0,colorspace_pars_fragment:l0,envmap_fragment:c0,envmap_common_pars_fragment:h0,envmap_pars_fragment:u0,envmap_pars_vertex:d0,envmap_physical_pars_fragment:S0,envmap_vertex:f0,fog_vertex:p0,fog_pars_vertex:m0,fog_fragment:g0,fog_pars_fragment:x0,gradientmap_pars_fragment:_0,lightmap_pars_fragment:y0,lights_lambert_fragment:v0,lights_lambert_pars_fragment:M0,lights_pars_begin:b0,lights_toon_fragment:w0,lights_toon_pars_fragment:T0,lights_phong_fragment:E0,lights_phong_pars_fragment:A0,lights_physical_fragment:C0,lights_physical_pars_fragment:R0,lights_fragment_begin:P0,lights_fragment_maps:I0,lights_fragment_end:L0,lightprobes_pars_fragment:D0,logdepthbuf_fragment:N0,logdepthbuf_pars_fragment:U0,logdepthbuf_pars_vertex:F0,logdepthbuf_vertex:k0,map_fragment:O0,map_pars_fragment:B0,map_particle_fragment:z0,map_particle_pars_fragment:H0,metalnessmap_fragment:V0,metalnessmap_pars_fragment:G0,morphinstance_vertex:W0,morphcolor_vertex:X0,morphnormal_vertex:Z0,morphtarget_pars_vertex:q0,morphtarget_vertex:$0,normal_fragment_begin:Y0,normal_fragment_maps:J0,normal_pars_fragment:K0,normal_pars_vertex:j0,normal_vertex:Q0,normalmap_pars_fragment:tx,clearcoat_normal_fragment_begin:ex,clearcoat_normal_fragment_maps:nx,clearcoat_pars_fragment:ix,iridescence_pars_fragment:sx,opaque_fragment:rx,packing:ax,premultiplied_alpha_fragment:ox,project_vertex:lx,dithering_fragment:cx,dithering_pars_fragment:hx,roughnessmap_fragment:ux,roughnessmap_pars_fragment:dx,shadowmap_pars_fragment:fx,shadowmap_pars_vertex:px,shadowmap_vertex:mx,shadowmask_pars_fragment:gx,skinbase_vertex:xx,skinning_pars_vertex:_x,skinning_vertex:yx,skinnormal_vertex:vx,specularmap_fragment:Mx,specularmap_pars_fragment:bx,tonemapping_fragment:Sx,tonemapping_pars_fragment:wx,transmission_fragment:Tx,transmission_pars_fragment:Ex,uv_pars_fragment:Ax,uv_pars_vertex:Cx,uv_vertex:Rx,worldpos_vertex:Px,background_vert:Ix,background_frag:Lx,backgroundCube_vert:Dx,backgroundCube_frag:Nx,cube_vert:Ux,cube_frag:Fx,depth_vert:kx,depth_frag:Ox,distance_vert:Bx,distance_frag:zx,equirect_vert:Hx,equirect_frag:Vx,linedashed_vert:Gx,linedashed_frag:Wx,meshbasic_vert:Xx,meshbasic_frag:Zx,meshlambert_vert:qx,meshlambert_frag:$x,meshmatcap_vert:Yx,meshmatcap_frag:Jx,meshnormal_vert:Kx,meshnormal_frag:jx,meshphong_vert:Qx,meshphong_frag:t_,meshphysical_vert:e_,meshphysical_frag:n_,meshtoon_vert:i_,meshtoon_frag:s_,points_vert:r_,points_frag:a_,shadow_vert:o_,shadow_frag:l_,sprite_vert:c_,sprite_frag:h_},ut={common:{diffuse:{value:new At(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ut},alphaMap:{value:null},alphaMapTransform:{value:new Ut},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ut}},envmap:{envMap:{value:null},envMapRotation:{value:new Ut},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ut}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ut}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ut},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ut},normalScale:{value:new bt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ut},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ut}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ut}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ut}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new At(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new At(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ut},alphaTest:{value:0},uvTransform:{value:new Ut}},sprite:{diffuse:{value:new At(16777215)},opacity:{value:1},center:{value:new bt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ut},alphaMap:{value:null},alphaMapTransform:{value:new Ut},alphaTest:{value:0}}},Gn={basic:{uniforms:Je([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.fog]),vertexShader:Bt.meshbasic_vert,fragmentShader:Bt.meshbasic_frag},lambert:{uniforms:Je([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new At(0)},envMapIntensity:{value:1}}]),vertexShader:Bt.meshlambert_vert,fragmentShader:Bt.meshlambert_frag},phong:{uniforms:Je([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new At(0)},specular:{value:new At(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Bt.meshphong_vert,fragmentShader:Bt.meshphong_frag},standard:{uniforms:Je([ut.common,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.roughnessmap,ut.metalnessmap,ut.fog,ut.lights,{emissive:{value:new At(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Bt.meshphysical_vert,fragmentShader:Bt.meshphysical_frag},toon:{uniforms:Je([ut.common,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.gradientmap,ut.fog,ut.lights,{emissive:{value:new At(0)}}]),vertexShader:Bt.meshtoon_vert,fragmentShader:Bt.meshtoon_frag},matcap:{uniforms:Je([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,{matcap:{value:null}}]),vertexShader:Bt.meshmatcap_vert,fragmentShader:Bt.meshmatcap_frag},points:{uniforms:Je([ut.points,ut.fog]),vertexShader:Bt.points_vert,fragmentShader:Bt.points_frag},dashed:{uniforms:Je([ut.common,ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Bt.linedashed_vert,fragmentShader:Bt.linedashed_frag},depth:{uniforms:Je([ut.common,ut.displacementmap]),vertexShader:Bt.depth_vert,fragmentShader:Bt.depth_frag},normal:{uniforms:Je([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,{opacity:{value:1}}]),vertexShader:Bt.meshnormal_vert,fragmentShader:Bt.meshnormal_frag},sprite:{uniforms:Je([ut.sprite,ut.fog]),vertexShader:Bt.sprite_vert,fragmentShader:Bt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ut},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Bt.background_vert,fragmentShader:Bt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ut}},vertexShader:Bt.backgroundCube_vert,fragmentShader:Bt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Bt.cube_vert,fragmentShader:Bt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Bt.equirect_vert,fragmentShader:Bt.equirect_frag},distance:{uniforms:Je([ut.common,ut.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Bt.distance_vert,fragmentShader:Bt.distance_frag},shadow:{uniforms:Je([ut.lights,ut.fog,{color:{value:new At(0)},opacity:{value:1}}]),vertexShader:Bt.shadow_vert,fragmentShader:Bt.shadow_frag}};Gn.physical={uniforms:Je([Gn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ut},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ut},clearcoatNormalScale:{value:new bt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ut},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ut},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ut},sheen:{value:0},sheenColor:{value:new At(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ut},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ut},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ut},transmissionSamplerSize:{value:new bt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ut},attenuationDistance:{value:0},attenuationColor:{value:new At(0)},specularColor:{value:new At(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ut},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ut},anisotropyVector:{value:new bt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ut}}]),vertexShader:Bt.meshphysical_vert,fragmentShader:Bt.meshphysical_frag};var Fl={r:0,b:0,g:0},u_=new ue,hp=new Ut;hp.set(-1,0,0,0,1,0,0,0,1);function d_(i,t,e,n,s,r){let a=new At(0),o=s===!0?0:1,l,c,h=null,d=0,u=null;function f(b){let C=b.isScene===!0?b.background:null;if(C&&C.isTexture){let M=b.backgroundBlurriness>0;C=t.get(C,M)}return C}function x(b){let C=!1,M=f(b);M===null?m(a,o):M&&M.isColor&&(m(M,1),C=!0);let w=i.xr.getEnvironmentBlendMode();w==="additive"?e.buffers.color.setClear(0,0,0,1,r):w==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||C)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(b,C){let M=f(C);M&&(M.isCubeTexture||M.mapping===aa)?(c===void 0&&(c=new Nt(new We(1,1,1),new Se({name:"BackgroundCubeMaterial",uniforms:Zi(Gn.backgroundCube.uniforms),vertexShader:Gn.backgroundCube.vertexShader,fragmentShader:Gn.backgroundCube.fragmentShader,side:tn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(w,S,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=M,c.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(u_.makeRotationFromEuler(C.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(hp),c.material.toneMapped=Ht.getTransfer(M.colorSpace)!==Jt,(h!==M||d!==M.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=M,d=M.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new Nt(new Ie(2,2),new Se({name:"BackgroundMaterial",uniforms:Zi(Gn.background.uniforms),vertexShader:Gn.background.vertexShader,fragmentShader:Gn.background.fragmentShader,side:Mi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.toneMapped=Ht.getTransfer(M.colorSpace)!==Jt,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||d!==M.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=M,d=M.version,u=i.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null))}function m(b,C){b.getRGB(Fl,Bh(i)),e.buffers.color.setClear(Fl.r,Fl.g,Fl.b,C,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,C=1){a.set(b),o=C,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(b){o=b,m(a,o)},render:x,addToRenderList:g,dispose:p}}function f_(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(U,F,B,P,O){let W=!1,Z=d(U,P,B,F);r!==Z&&(r=Z,c(r.object)),W=f(U,P,B,O),W&&x(U,P,B,O),O!==null&&t.update(O,i.ELEMENT_ARRAY_BUFFER),(W||a)&&(a=!1,M(U,F,B,P),O!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(O).buffer))}function l(){return i.createVertexArray()}function c(U){return i.bindVertexArray(U)}function h(U){return i.deleteVertexArray(U)}function d(U,F,B,P){let O=P.wireframe===!0,W=n[F.id];W===void 0&&(W={},n[F.id]=W);let Z=U.isInstancedMesh===!0?U.id:0,nt=W[Z];nt===void 0&&(nt={},W[Z]=nt);let q=nt[B.id];q===void 0&&(q={},nt[B.id]=q);let Q=q[O];return Q===void 0&&(Q=u(l()),q[O]=Q),Q}function u(U){let F=[],B=[],P=[];for(let O=0;O<e;O++)F[O]=0,B[O]=0,P[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:B,attributeDivisors:P,object:U,attributes:{},index:null}}function f(U,F,B,P){let O=r.attributes,W=F.attributes,Z=0,nt=B.getAttributes();for(let q in nt)if(nt[q].location>=0){let et=O[q],Pt=W[q];if(Pt===void 0&&(q==="instanceMatrix"&&U.instanceMatrix&&(Pt=U.instanceMatrix),q==="instanceColor"&&U.instanceColor&&(Pt=U.instanceColor)),et===void 0||et.attribute!==Pt||Pt&&et.data!==Pt.data)return!0;Z++}return r.attributesNum!==Z||r.index!==P}function x(U,F,B,P){let O={},W=F.attributes,Z=0,nt=B.getAttributes();for(let q in nt)if(nt[q].location>=0){let et=W[q];et===void 0&&(q==="instanceMatrix"&&U.instanceMatrix&&(et=U.instanceMatrix),q==="instanceColor"&&U.instanceColor&&(et=U.instanceColor));let Pt={};Pt.attribute=et,et&&et.data&&(Pt.data=et.data),O[q]=Pt,Z++}r.attributes=O,r.attributesNum=Z,r.index=P}function g(){let U=r.newAttributes;for(let F=0,B=U.length;F<B;F++)U[F]=0}function m(U){p(U,0)}function p(U,F){let B=r.newAttributes,P=r.enabledAttributes,O=r.attributeDivisors;B[U]=1,P[U]===0&&(i.enableVertexAttribArray(U),P[U]=1),O[U]!==F&&(i.vertexAttribDivisor(U,F),O[U]=F)}function b(){let U=r.newAttributes,F=r.enabledAttributes;for(let B=0,P=F.length;B<P;B++)F[B]!==U[B]&&(i.disableVertexAttribArray(B),F[B]=0)}function C(U,F,B,P,O,W,Z){Z===!0?i.vertexAttribIPointer(U,F,B,O,W):i.vertexAttribPointer(U,F,B,P,O,W)}function M(U,F,B,P){g();let O=P.attributes,W=B.getAttributes(),Z=F.defaultAttributeValues;for(let nt in W){let q=W[nt];if(q.location>=0){let Q=O[nt];if(Q===void 0&&(nt==="instanceMatrix"&&U.instanceMatrix&&(Q=U.instanceMatrix),nt==="instanceColor"&&U.instanceColor&&(Q=U.instanceColor)),Q!==void 0){let et=Q.normalized,Pt=Q.itemSize,Ct=t.get(Q);if(Ct===void 0)continue;let oe=Ct.buffer,Zt=Ct.type,Kt=Ct.bytesPerElement,$=Zt===i.INT||Zt===i.UNSIGNED_INT||Q.gpuType===Ko;if(Q.isInterleavedBufferAttribute){let j=Q.data,yt=j.stride,Ft=Q.offset;if(j.isInstancedInterleavedBuffer){for(let gt=0;gt<q.locationSize;gt++)p(q.location+gt,j.meshPerAttribute);U.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let gt=0;gt<q.locationSize;gt++)m(q.location+gt);i.bindBuffer(i.ARRAY_BUFFER,oe);for(let gt=0;gt<q.locationSize;gt++)C(q.location+gt,Pt/q.locationSize,Zt,et,yt*Kt,(Ft+Pt/q.locationSize*gt)*Kt,$)}else{if(Q.isInstancedBufferAttribute){for(let j=0;j<q.locationSize;j++)p(q.location+j,Q.meshPerAttribute);U.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let j=0;j<q.locationSize;j++)m(q.location+j);i.bindBuffer(i.ARRAY_BUFFER,oe);for(let j=0;j<q.locationSize;j++)C(q.location+j,Pt/q.locationSize,Zt,et,Pt*Kt,Pt/q.locationSize*j*Kt,$)}}else if(Z!==void 0){let et=Z[nt];if(et!==void 0)switch(et.length){case 2:i.vertexAttrib2fv(q.location,et);break;case 3:i.vertexAttrib3fv(q.location,et);break;case 4:i.vertexAttrib4fv(q.location,et);break;default:i.vertexAttrib1fv(q.location,et)}}}}b()}function w(){T();for(let U in n){let F=n[U];for(let B in F){let P=F[B];for(let O in P){let W=P[O];for(let Z in W)h(W[Z].object),delete W[Z];delete P[O]}}delete n[U]}}function S(U){if(n[U.id]===void 0)return;let F=n[U.id];for(let B in F){let P=F[B];for(let O in P){let W=P[O];for(let Z in W)h(W[Z].object),delete W[Z];delete P[O]}}delete n[U.id]}function A(U){for(let F in n){let B=n[F];for(let P in B){let O=B[P];if(O[U.id]===void 0)continue;let W=O[U.id];for(let Z in W)h(W[Z].object),delete W[Z];delete O[U.id]}}}function y(U){for(let F in n){let B=n[F],P=U.isInstancedMesh===!0?U.id:0,O=B[P];if(O!==void 0){for(let W in O){let Z=O[W];for(let nt in Z)h(Z[nt].object),delete Z[nt];delete O[W]}delete B[P],Object.keys(B).length===0&&delete n[F]}}}function T(){R(),a=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:T,resetDefaultState:R,dispose:w,releaseStatesOfGeometry:S,releaseStatesOfObject:y,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:m,disableUnusedAttributes:b}}function p_(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function m_(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let A=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(A){return!(A!==yn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){let y=A===Le&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(A!==on&&A!==Pn&&!y&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(A){if(A==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Dt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Dt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),b=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),w=i.getParameter(i.MAX_SAMPLES),S=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:b,maxVaryings:C,maxFragmentUniforms:M,maxSamples:w,samples:S}}function g_(i){let t=this,e=null,n=0,s=!1,r=!1,a=new Qe,o=new Ut,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){let x=d.clippingPlanes,g=d.clipIntersection,m=d.clipShadows,p=i.get(d);if(!s||x===null||x.length===0||r&&!m)r?h(null):c();else{let b=r?0:n,C=b*4,M=p.clippingState||null;l.value=M,M=h(x,u,C,f);for(let w=0;w!==C;++w)M[w]=e[w];p.clippingState=M,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=b}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,x){let g=d!==null?d.length:0,m=null;if(g!==0){if(m=l.value,x!==!0||m===null){let p=f+g*4,b=u.matrixWorldInverse;o.getNormalMatrix(b),(m===null||m.length<p)&&(m=new Float32Array(p));for(let C=0,M=f;C!==g;++C,M+=4)a.copy(d[C]).applyMatrix4(b,o),a.normal.toArray(m,M),m[M+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,m}}var $s=4,x_=6,__=20,y_=256,pa=new Vi,Vf=new At,Gh=null,Wh=0,Xh=0,Zh=!1,v_=new D,qi=new D,Js=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=v_}=r;Gh=this._renderer.getRenderTarget(),Wh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),Zh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Wf(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Gh,Wh,Xh),this._renderer.xr.enabled=Zh,t.scissorTest=!1,qs(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Si||t.mapping===Xi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Gh=this._renderer.getRenderTarget(),Wh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),Zh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Ve,minFilter:Ve,generateMipmaps:!1,type:Le,format:yn,colorSpace:Ir,depthBuffer:!1},s=Gf(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Gf(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=M_(r)),this._blurMaterial=S_(r,t,e),this._ggxMaterial=b_(r,t,e)}return s}_compileMaterial(t){let e=new Nt(new _e,t);this._renderer.compile(e,pa)}_sceneToCubeUV(t,e,n,s,r){let l=new ke(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Vf),d.toneMapping=fn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Nt(new We,new be({name:"PMREM.Background",side:tn,depthWrite:!1,depthTest:!1})));let g=this._backgroundBox,m=g.material,p=!1,b=t.background;b?b.isColor&&(m.color.copy(b),t.background=null,p=!0):(m.color.copy(Vf),p=!0);for(let C=0;C<6;C++){let M=C%3;M===0?(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[C],r.y,r.z)):M===1?(l.up.set(0,0,c[C]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[C],r.z)):(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[C]));let w=this._cubeSize;qs(s,M*w,C>2?w:0,w,w),d.setRenderTarget(s),p&&d.render(g,l),d.render(t,l)}d.toneMapping=f,d.autoClear=u,t.background=b}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===Si||t.mapping===Xi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xf()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Wf());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let l=this._cubeSize;qs(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,pa)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=c*1.25,f=d*u,{_lodMax:x}=this,g=this._sizeLods[n],m=3*g*(n>x-$s?n-x+$s:0),p=4*(this._cubeSize-g);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=x-e,qs(r,m,p,3*g,2*g),s.setRenderTarget(r),s.render(o,pa),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-n,qs(t,m,p,3*g,2*g),s.setRenderTarget(t),s.render(o,pa)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],d=3*h*(s>this._lodMax-$s?s-this._lodMax+$s:0),u=4*(this._cubeSize-h);qs(e,d,u,3*h,2*h),a.setRenderTarget(e),a.render(l,pa)}};function M_(i){let t=[],e=[],n=i,s=i-$s+1+x_;for(let r=0;r<s;r++){let a=Math.pow(2,n);t.push(a);let o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,u=6,f=3,x=new Float32Array(f*u*d),g=new Float32Array(f*u*d);for(let p=0;p<d;p++){let b=p%3*2/3-1,C=p>2?0:-1,M=[b,C,0,b+2/3,C,0,b+2/3,C+1,0,b,C,0,b+2/3,C+1,0,b,C+1,0];x.set(M,f*u*p);for(let w=0;w<u;w++){let S=h[w*2]*2-1,A=h[w*2+1]*2-1;p===0?qi.set(1,A,S):p===1?qi.set(-S,1,-A):p===2?qi.set(-S,A,1):p===3?qi.set(-1,A,-S):p===4?qi.set(-S,-1,A):qi.set(S,A,-1),qi.toArray(g,(p*u+w)*f)}}let m=new _e;m.setAttribute("position",new Oe(x,f)),m.setAttribute("outputDirection",new Oe(g,f)),e.push(new Nt(m,null)),n>$s&&n--}return{lodMeshes:e,sizeLods:t}}function Gf(i,t,e){let n=new ye(i,t,e);return n.texture.mapping=aa,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function qs(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function b_(i,t,e){return new Se({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:y_,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:zl(),fragmentShader:`

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
		`,blending:xn,depthTest:!1,depthWrite:!1})}function S_(i,t,e){return new Se({name:"SphericalGaussianBlur",defines:{SAMPLES:__,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:zl(),fragmentShader:`

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
		`,blending:xn,depthTest:!1,depthWrite:!1})}function Wf(){return new Se({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:zl(),fragmentShader:`

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
		`,blending:xn,depthTest:!1,depthWrite:!1})}function Xf(){return new Se({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:zl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:xn,depthTest:!1,depthWrite:!1})}function zl(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ol=class extends ye{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Hr(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new We(5,5,5),r=new Se({name:"CubemapFromEquirect",uniforms:Zi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:tn,blending:xn});r.uniforms.tEquirect.value=e;let a=new Nt(s,r),o=e.minFilter;return e.minFilter===Hn&&(e.minFilter=Ve),new qo(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}};function w_(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Ws||f===Yo)if(t.has(u)){let x=t.get(u).texture;return o(x,u.mapping)}else{let x=u.image;if(x&&x.height>0){let g=new Ol(x.height);return g.fromEquirectangularTexture(i,u),t.set(u,g),u.addEventListener("dispose",c),o(g.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,x=f===Ws||f===Yo,g=f===Si||f===Xi;if(x||g){let m=e.get(u),p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new Js(i)),m=x?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{let b=u.image;return x&&b&&b.height>0||g&&b&&l(b)?(n===null&&(n=new Js(i)),m=x?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function o(u,f){return f===Ws?u.mapping=Si:f===Yo&&(u.mapping=Xi),u}function l(u){let f=0,x=6;for(let g=0;g<x;g++)u[g]!==void 0&&f++;return f===x}function c(u){let f=u.target;f.removeEventListener("dispose",c);let x=t.get(f);x!==void 0&&(t.delete(f),x.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let x=e.get(f);x!==void 0&&(e.delete(f),x.dispose())}function d(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function T_(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&Bi("WebGLRenderer: "+n+" extension not supported."),s}}}function E_(i,t,e,n){let s={},r=new WeakMap;function a(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let x in u.attributes)t.remove(u.attributes[x]);u.removeEventListener("dispose",a),delete s[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(d,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,e.memory.geometries++),u}function l(d){let u=d.attributes;for(let f in u)t.update(u[f],i.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,x=d.attributes.position,g=0;if(x===void 0)return;if(f!==null){let b=f.array;g=f.version;for(let C=0,M=b.length;C<M;C+=3){let w=b[C+0],S=b[C+1],A=b[C+2];u.push(w,S,S,A,A,w)}}else{let b=x.array;g=x.version;for(let C=0,M=b.length/3-1;C<M;C+=3){let w=C+0,S=C+1,A=C+2;u.push(w,S,S,A,A,w)}}let m=new(x.count>=65535?Br:Or)(u,1);m.version=g;let p=r.get(d);p&&t.remove(p),r.set(d,m)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function A_(i,t,e){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*a),e.update(u,n,1)}function c(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*a,f),e.update(u,n,f))}function h(d,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let g=0;for(let m=0;m<f;m++)g+=u[m];e.update(g,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function C_(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:Lt("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function R_(i,t,e){let n=new WeakMap,s=new me;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==d){let T=function(){A.dispose(),n.delete(o),o.removeEventListener("dispose",T)};u!==void 0&&u.texture.dispose();let f=o.morphAttributes.position!==void 0,x=o.morphAttributes.normal!==void 0,g=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],b=o.morphAttributes.color||[],C=0;f===!0&&(C=1),x===!0&&(C=2),g===!0&&(C=3);let M=o.attributes.position.count*C,w=1;M>t.maxTextureSize&&(w=Math.ceil(M/t.maxTextureSize),M=t.maxTextureSize);let S=new Float32Array(M*w*4*d),A=new Fr(S,M,w,d);A.type=Pn,A.needsUpdate=!0;let y=C*4;for(let R=0;R<d;R++){let U=m[R],F=p[R],B=b[R],P=M*w*4*R;for(let O=0;O<U.count;O++){let W=O*y;f===!0&&(s.fromBufferAttribute(U,O),S[P+W+0]=s.x,S[P+W+1]=s.y,S[P+W+2]=s.z,S[P+W+3]=0),x===!0&&(s.fromBufferAttribute(F,O),S[P+W+4]=s.x,S[P+W+5]=s.y,S[P+W+6]=s.z,S[P+W+7]=0),g===!0&&(s.fromBufferAttribute(B,O),S[P+W+8]=s.x,S[P+W+9]=s.y,S[P+W+10]=s.z,S[P+W+11]=B.itemSize===4?s.w:1)}}u={count:d,texture:A,size:new bt(M,w)},n.set(o,u),o.addEventListener("dispose",T)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];let x=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function P_(i,t,e,n,s){let r=new WeakMap;function a(c){let h=s.render.frame,d=c.geometry,u=t.get(c,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var I_={[Qr]:"LINEAR_TONE_MAPPING",[ta]:"REINHARD_TONE_MAPPING",[ea]:"CINEON_TONE_MAPPING",[na]:"ACES_FILMIC_TONE_MAPPING",[sa]:"AGX_TONE_MAPPING",[ra]:"NEUTRAL_TONE_MAPPING",[ia]:"CUSTOM_TONE_MAPPING"};function L_(i,t,e,n,s,r){let a=new ye(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new _e;c.setAttribute("position",new ee([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new ee([0,2,0,0,2,0],2));let h=new Bs({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),d=new Nt(c,h),u=new Vi(-1,1,1,-1,0,1),f=null,x=null,g=!1,m,p=null,b=[],C=!1;this.setSize=function(M,w){a.setSize(M,w),o!==null&&o.setSize(M,w),l!==null&&l.setSize(M,w);for(let S=0;S<b.length;S++){let A=b[S];A.setSize&&A.setSize(M,w)}},this.setEffects=function(M){b=M,C=b.length>0&&b[0].isRenderPass===!0;let w=a.width,S=a.height;b.length>0&&o===null&&(o=new ye(w,S,{type:Le,depthBuffer:!1,stencilBuffer:!1}),l=new ye(w,S,{type:Le,depthBuffer:!1,stencilBuffer:!1}));for(let A=0;A<b.length;A++){let y=b[A];y.setSize&&y.setSize(w,S)}},this.begin=function(M,w){if(g||M.toneMapping===fn&&b.length===0)return!1;if(p=w,w!==null){let S=w.width,A=w.height;(a.width!==S||a.height!==A)&&this.setSize(S,A)}return C===!1&&M.setRenderTarget(a),m=M.toneMapping,M.toneMapping=fn,!0},this.hasRenderPass=function(){return C},this.end=function(M,w){M.toneMapping=m,g=!0;let S=a,A=o;for(let y=0;y<b.length;y++){let T=b[y];T.enabled!==!1&&(T.render(M,A,S,w),T.needsSwap!==!1&&(S=A,A=A===o?l:o))}if(f!==M.outputColorSpace||x!==M.toneMapping){f=M.outputColorSpace,x=M.toneMapping,h.defines={},Ht.getTransfer(f)===Jt&&(h.defines.SRGB_TRANSFER="");let y=I_[x];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=S.texture,M.setRenderTarget(p),M.render(d,u),p=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var up=new Pe,Yh=new xi(1,1),dp=new Fr,fp=new Io,pp=new Hr,Zf=[],qf=[],$f=new Float32Array(16),Yf=new Float32Array(9),Jf=new Float32Array(4);function Ks(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Zf[s];if(r===void 0&&(r=new Float32Array(s),Zf[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function De(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ne(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Hl(i,t){let e=qf[t];e===void 0&&(e=new Int32Array(t),qf[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function D_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function N_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(De(e,t))return;i.uniform2fv(this.addr,t),Ne(e,t)}}function U_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(De(e,t))return;i.uniform3fv(this.addr,t),Ne(e,t)}}function F_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(De(e,t))return;i.uniform4fv(this.addr,t),Ne(e,t)}}function k_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(De(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ne(e,t)}else{if(De(e,n))return;Jf.set(n),i.uniformMatrix2fv(this.addr,!1,Jf),Ne(e,n)}}function O_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(De(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ne(e,t)}else{if(De(e,n))return;Yf.set(n),i.uniformMatrix3fv(this.addr,!1,Yf),Ne(e,n)}}function B_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(De(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ne(e,t)}else{if(De(e,n))return;$f.set(n),i.uniformMatrix4fv(this.addr,!1,$f),Ne(e,n)}}function z_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function H_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(De(e,t))return;i.uniform2iv(this.addr,t),Ne(e,t)}}function V_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(De(e,t))return;i.uniform3iv(this.addr,t),Ne(e,t)}}function G_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(De(e,t))return;i.uniform4iv(this.addr,t),Ne(e,t)}}function W_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function X_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(De(e,t))return;i.uniform2uiv(this.addr,t),Ne(e,t)}}function Z_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(De(e,t))return;i.uniform3uiv(this.addr,t),Ne(e,t)}}function q_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(De(e,t))return;i.uniform4uiv(this.addr,t),Ne(e,t)}}function $_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Yh.compareFunction=e.isReversedDepthBuffer()?Ul:Nl,r=Yh):r=up,e.setTexture2D(t||r,s)}function Y_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||fp,s)}function J_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||pp,s)}function K_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||dp,s)}function j_(i){switch(i){case 5126:return D_;case 35664:return N_;case 35665:return U_;case 35666:return F_;case 35674:return k_;case 35675:return O_;case 35676:return B_;case 5124:case 35670:return z_;case 35667:case 35671:return H_;case 35668:case 35672:return V_;case 35669:case 35673:return G_;case 5125:return W_;case 36294:return X_;case 36295:return Z_;case 36296:return q_;case 35678:case 36198:case 36298:case 36306:case 35682:return $_;case 35679:case 36299:case 36307:return Y_;case 35680:case 36300:case 36308:case 36293:return J_;case 36289:case 36303:case 36311:case 36292:return K_}}function Q_(i,t){i.uniform1fv(this.addr,t)}function ty(i,t){let e=Ks(t,this.size,2);i.uniform2fv(this.addr,e)}function ey(i,t){let e=Ks(t,this.size,3);i.uniform3fv(this.addr,e)}function ny(i,t){let e=Ks(t,this.size,4);i.uniform4fv(this.addr,e)}function iy(i,t){let e=Ks(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function sy(i,t){let e=Ks(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function ry(i,t){let e=Ks(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function ay(i,t){i.uniform1iv(this.addr,t)}function oy(i,t){i.uniform2iv(this.addr,t)}function ly(i,t){i.uniform3iv(this.addr,t)}function cy(i,t){i.uniform4iv(this.addr,t)}function hy(i,t){i.uniform1uiv(this.addr,t)}function uy(i,t){i.uniform2uiv(this.addr,t)}function dy(i,t){i.uniform3uiv(this.addr,t)}function fy(i,t){i.uniform4uiv(this.addr,t)}function py(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);De(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=Yh:a=up;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function my(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);De(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||fp,r[a])}function gy(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);De(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||pp,r[a])}function xy(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);De(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||dp,r[a])}function _y(i){switch(i){case 5126:return Q_;case 35664:return ty;case 35665:return ey;case 35666:return ny;case 35674:return iy;case 35675:return sy;case 35676:return ry;case 5124:case 35670:return ay;case 35667:case 35671:return oy;case 35668:case 35672:return ly;case 35669:case 35673:return cy;case 5125:return hy;case 36294:return uy;case 36295:return dy;case 36296:return fy;case 35678:case 36198:case 36298:case 36306:case 35682:return py;case 35679:case 36299:case 36307:return my;case 35680:case 36300:case 36308:case 36293:return gy;case 36289:case 36303:case 36311:case 36292:return xy}}var Jh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=j_(e.type)}},Kh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=_y(e.type)}},jh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},qh=/(\w+)(\])?(\[|\.)?/g;function Kf(i,t){i.seq.push(t),i.map[t.id]=t}function yy(i,t,e){let n=i.name,s=n.length;for(qh.lastIndex=0;;){let r=qh.exec(n),a=qh.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Kf(e,c===void 0?new Jh(o,i,t):new Kh(o,i,t));break}else{let d=e.map[o];d===void 0&&(d=new jh(o),Kf(e,d)),e=d}}}var Ys=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);yy(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function jf(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var vy=37297,My=0;function by(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var Qf=new Ut;function Sy(i){Ht._getMatrix(Qf,Ht.workingColorSpace,i);let t=`mat3( ${Qf.elements.map(e=>e.toFixed(4))} )`;switch(Ht.getTransfer(i)){case Lr:return[t,"LinearTransferOETF"];case Jt:return[t,"sRGBTransferOETF"];default:return Dt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function tp(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+by(i.getShaderSource(t),o)}else return r}function wy(i,t){let e=Sy(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var Ty={[Qr]:"Linear",[ta]:"Reinhard",[ea]:"Cineon",[na]:"ACESFilmic",[sa]:"AgX",[ra]:"Neutral",[ia]:"Custom"};function Ey(i,t){let e=Ty[t];return e===void 0?(Dt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var kl=new D;function Ay(){Ht.getLuminanceCoefficients(kl);let i=kl.x.toFixed(4),t=kl.y.toFixed(4),e=kl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Cy(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ga).join(`
`)}function Ry(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Py(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function ga(i){return i!==""}function ep(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function np(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Iy=/^[ \t]*#include +<([\w\d./]+)>/gm;function Qh(i){return i.replace(Iy,Dy)}var Ly=new Map;function Dy(i,t){let e=Bt[t];if(e===void 0){let n=Ly.get(t);if(n!==void 0)e=Bt[n],Dt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Qh(e)}var Ny=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ip(i){return i.replace(Ny,Uy)}function Uy(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function sp(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}var Fy={[Gi]:"SHADOWMAP_TYPE_PCF",[Gs]:"SHADOWMAP_TYPE_VSM"};function ky(i){return Fy[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Oy={[Si]:"ENVMAP_TYPE_CUBE",[Xi]:"ENVMAP_TYPE_CUBE",[aa]:"ENVMAP_TYPE_CUBE_UV"};function By(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Oy[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var zy={[Xi]:"ENVMAP_MODE_REFRACTION"};function Hy(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":zy[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Vy={[Ch]:"ENVMAP_BLENDING_MULTIPLY",[bf]:"ENVMAP_BLENDING_MIX",[Sf]:"ENVMAP_BLENDING_ADD"};function Gy(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Vy[i.combine]||"ENVMAP_BLENDING_NONE"}function Wy(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Xy(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=ky(e),c=By(e),h=Hy(e),d=Gy(e),u=Wy(e),f=Cy(e),x=Ry(r),g=s.createProgram(),m,p,b=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ga).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ga).join(`
`),p.length>0&&(p+=`
`)):(m=[sp(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ga).join(`
`),p=[sp(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==fn?"#define TONE_MAPPING":"",e.toneMapping!==fn?Bt.tonemapping_pars_fragment:"",e.toneMapping!==fn?Ey("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Bt.colorspace_pars_fragment,wy("linearToOutputTexel",e.outputColorSpace),Ay(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ga).join(`
`)),a=Qh(a),a=ep(a,e),a=np(a,e),o=Qh(o),o=ep(o,e),o=np(o,e),a=ip(a),o=ip(o),e.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===Oh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Oh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let C=b+m+a,M=b+p+o,w=jf(s,s.VERTEX_SHADER,C),S=jf(s,s.FRAGMENT_SHADER,M);s.attachShader(g,w),s.attachShader(g,S),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function A(U){if(i.debug.checkShaderErrors){let F=s.getProgramInfoLog(g)||"",B=s.getShaderInfoLog(w)||"",P=s.getShaderInfoLog(S)||"",O=F.trim(),W=B.trim(),Z=P.trim(),nt=!0,q=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(nt=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,g,w,S);else{let Q=tp(s,w,"vertex"),et=tp(s,S,"fragment");Lt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+U.name+`
Material Type: `+U.type+`

Program Info Log: `+O+`
`+Q+`
`+et)}else O!==""?Dt("WebGLProgram: Program Info Log:",O):(W===""||Z==="")&&(q=!1);q&&(U.diagnostics={runnable:nt,programLog:O,vertexShader:{log:W,prefix:m},fragmentShader:{log:Z,prefix:p}})}s.deleteShader(w),s.deleteShader(S),y=new Ys(s,g),T=Py(s,g)}let y;this.getUniforms=function(){return y===void 0&&A(this),y};let T;this.getAttributes=function(){return T===void 0&&A(this),T};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(g,vy)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=My++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=w,this.fragmentShader=S,this}var Zy=0,tu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new eu(t),e.set(t,n)),n}},eu=class{constructor(t){this.id=Zy++,this.code=t,this.usedTimes=0}};function qy(i){return i===Ti||i===da||i===fa}function $y(i,t,e,n,s,r){let a=new Ds,o=new tu,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return l.add(y),y===0?"uv":`uv${y}`}function g(y,T,R,U,F,B){let P=U.fog,O=F.geometry,W=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?U.environment:null,Z=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,nt=t.get(y.envMap||W,Z),q=nt&&nt.mapping===aa?nt.image.height:null,Q=f[y.type];y.precision!==null&&(u=n.getMaxPrecision(y.precision),u!==y.precision&&Dt("WebGLProgram.getParameters:",y.precision,"not supported, using",u,"instead."));let et=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,Pt=et!==void 0?et.length:0,Ct=0;O.morphAttributes.position!==void 0&&(Ct=1),O.morphAttributes.normal!==void 0&&(Ct=2),O.morphAttributes.color!==void 0&&(Ct=3);let oe,Zt,Kt,$;if(Q){let ce=Gn[Q];oe=ce.vertexShader,Zt=ce.fragmentShader}else{oe=y.vertexShader,Zt=y.fragmentShader;let ce=o.getVertexShaderStage(y),Qt=o.getFragmentShaderStage(y);o.update(y,ce,Qt),Kt=ce.id,$=Qt.id}let j=i.getRenderTarget(),yt=i.state.buffers.depth.getReversed(),Ft=F.isInstancedMesh===!0,gt=F.isBatchedMesh===!0,zt=!!y.map,Ce=!!y.matcap,Vt=!!nt,Yt=!!y.aoMap,le=!!y.lightMap,Wt=!!y.bumpMap&&y.wireframe===!1,pe=!!y.normalMap,Ue=!!y.displacementMap,nn=!!y.emissiveMap,xe=!!y.metalnessMap,we=!!y.roughnessMap,N=y.anisotropy>0,Ze=y.clearcoat>0,ne=y.dispersion>0,E=y.retroreflectivity>0,_=y.iridescence>0,k=y.sheen>0,V=y.transmission>0,X=N&&!!y.anisotropyMap,it=Ze&&!!y.clearcoatMap,rt=Ze&&!!y.clearcoatNormalMap,Y=Ze&&!!y.clearcoatRoughnessMap,K=_&&!!y.iridescenceMap,at=_&&!!y.iridescenceThicknessMap,Tt=k&&!!y.sheenColorMap,ht=k&&!!y.sheenRoughnessMap,ot=!!y.specularMap,Et=!!y.specularColorMap,It=!!y.specularIntensityMap,kt=V&&!!y.transmissionMap,L=V&&!!y.thicknessMap,lt=!!y.gradientMap,J=!!y.alphaMap,ct=y.alphaTest>0,pt=!!y.alphaHash,tt=!!y.extensions,Rt=fn;y.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Rt=i.toneMapping);let St={shaderID:Q,shaderType:y.type,shaderName:y.name,vertexShader:oe,fragmentShader:Zt,defines:y.defines,customVertexShaderID:Kt,customFragmentShaderID:$,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:u,batching:gt,batchingColor:gt&&F._colorsTexture!==null,instancing:Ft,instancingColor:Ft&&F.instanceColor!==null,instancingMorph:Ft&&F.morphTexture!==null,outputColorSpace:j===null?i.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Ht.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:zt,matcap:Ce,envMap:Vt,envMapMode:Vt&&nt.mapping,envMapCubeUVHeight:q,aoMap:Yt,lightMap:le,bumpMap:Wt,normalMap:pe,displacementMap:Ue,emissiveMap:nn,normalMapObjectSpace:pe&&y.normalMapType===Ef,normalMapTangentSpace:pe&&y.normalMapType===Dl,packedNormalMap:pe&&y.normalMapType===Dl&&qy(y.normalMap.format),metalnessMap:xe,roughnessMap:we,anisotropy:N,anisotropyMap:X,clearcoat:Ze,clearcoatMap:it,clearcoatNormalMap:rt,clearcoatRoughnessMap:Y,dispersion:ne,retroreflection:E,iridescence:_,iridescenceMap:K,iridescenceThicknessMap:at,sheen:k,sheenColorMap:Tt,sheenRoughnessMap:ht,specularMap:ot,specularColorMap:Et,specularIntensityMap:It,transmission:V,transmissionMap:kt,thicknessMap:L,gradientMap:lt,opaque:y.transparent===!1&&y.blending===bi&&y.alphaToCoverage===!1,alphaMap:J,alphaTest:ct,alphaHash:pt,combine:y.combine,mapUv:zt&&x(y.map.channel),aoMapUv:Yt&&x(y.aoMap.channel),lightMapUv:le&&x(y.lightMap.channel),bumpMapUv:Wt&&x(y.bumpMap.channel),normalMapUv:pe&&x(y.normalMap.channel),displacementMapUv:Ue&&x(y.displacementMap.channel),emissiveMapUv:nn&&x(y.emissiveMap.channel),metalnessMapUv:xe&&x(y.metalnessMap.channel),roughnessMapUv:we&&x(y.roughnessMap.channel),anisotropyMapUv:X&&x(y.anisotropyMap.channel),clearcoatMapUv:it&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:rt&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Y&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:K&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:at&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:Tt&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:ht&&x(y.sheenRoughnessMap.channel),specularMapUv:ot&&x(y.specularMap.channel),specularColorMapUv:Et&&x(y.specularColorMap.channel),specularIntensityMapUv:It&&x(y.specularIntensityMap.channel),transmissionMapUv:kt&&x(y.transmissionMap.channel),thicknessMapUv:L&&x(y.thicknessMap.channel),alphaMapUv:J&&x(y.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(pe||N),vertexNormals:!!O.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!O.attributes.uv&&(zt||J),fog:!!P,useFog:y.fog===!0,fogExp2:!!P&&P.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||O.attributes.normal===void 0&&pe===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:yt,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:O.attributes.position!==void 0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:Pt,morphTextureStride:Ct,numSunLights:T.sun.length,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numSunLightShadows:T.sunShadowMap.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:Rt,decodeVideoTexture:zt&&y.map.isVideoTexture===!0&&Ht.getTransfer(y.map.colorSpace)===Jt,decodeVideoTextureEmissive:nn&&y.emissiveMap.isVideoTexture===!0&&Ht.getTransfer(y.emissiveMap.colorSpace)===Jt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===an,flipSided:y.side===tn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:tt&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(tt&&y.extensions.multiDraw===!0||gt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return St.vertexUv1s=l.has(1),St.vertexUv2s=l.has(2),St.vertexUv3s=l.has(3),l.clear(),St}function m(y){let T=[];if(y.shaderID?T.push(y.shaderID):(T.push(y.customVertexShaderID),T.push(y.customFragmentShaderID)),y.defines!==void 0)for(let R in y.defines)T.push(R),T.push(y.defines[R]);return y.isRawShaderMaterial===!1&&(p(T,y),b(T,y),T.push(i.outputColorSpace)),T.push(y.customProgramCacheKey),T.join()}function p(y,T){y.push(T.precision),y.push(T.outputColorSpace),y.push(T.envMapMode),y.push(T.envMapCubeUVHeight),y.push(T.mapUv),y.push(T.alphaMapUv),y.push(T.lightMapUv),y.push(T.aoMapUv),y.push(T.bumpMapUv),y.push(T.normalMapUv),y.push(T.displacementMapUv),y.push(T.emissiveMapUv),y.push(T.metalnessMapUv),y.push(T.roughnessMapUv),y.push(T.anisotropyMapUv),y.push(T.clearcoatMapUv),y.push(T.clearcoatNormalMapUv),y.push(T.clearcoatRoughnessMapUv),y.push(T.iridescenceMapUv),y.push(T.iridescenceThicknessMapUv),y.push(T.sheenColorMapUv),y.push(T.sheenRoughnessMapUv),y.push(T.specularMapUv),y.push(T.specularColorMapUv),y.push(T.specularIntensityMapUv),y.push(T.transmissionMapUv),y.push(T.thicknessMapUv),y.push(T.combine),y.push(T.fogExp2),y.push(T.sizeAttenuation),y.push(T.morphTargetsCount),y.push(T.morphAttributeCount),y.push(T.numSunLights),y.push(T.numDirLights),y.push(T.numPointLights),y.push(T.numSpotLights),y.push(T.numSpotLightMaps),y.push(T.numHemiLights),y.push(T.numRectAreaLights),y.push(T.numSunLightShadows),y.push(T.numDirLightShadows),y.push(T.numPointLightShadows),y.push(T.numSpotLightShadows),y.push(T.numSpotLightShadowsWithMaps),y.push(T.numLightProbes),y.push(T.shadowMapType),y.push(T.toneMapping),y.push(T.numClippingPlanes),y.push(T.numClipIntersection),y.push(T.depthPacking)}function b(y,T){a.disableAll(),T.instancing&&a.enable(0),T.instancingColor&&a.enable(1),T.instancingMorph&&a.enable(2),T.matcap&&a.enable(3),T.envMap&&a.enable(4),T.normalMapObjectSpace&&a.enable(5),T.normalMapTangentSpace&&a.enable(6),T.clearcoat&&a.enable(7),T.iridescence&&a.enable(8),T.alphaTest&&a.enable(9),T.vertexColors&&a.enable(10),T.vertexAlphas&&a.enable(11),T.vertexUv1s&&a.enable(12),T.vertexUv2s&&a.enable(13),T.vertexUv3s&&a.enable(14),T.vertexTangents&&a.enable(15),T.anisotropy&&a.enable(16),T.alphaHash&&a.enable(17),T.batching&&a.enable(18),T.dispersion&&a.enable(19),T.retroreflection&&a.enable(24),T.batchingColor&&a.enable(20),T.gradientMap&&a.enable(21),T.packedNormalMap&&a.enable(22),T.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),T.numLightProbeGrids>0&&a.enable(22),T.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function C(y){let T=f[y.type],R;if(T){let U=Gn[T];R=ti.clone(U.uniforms)}else R=y.uniforms;return R}function M(y,T){let R=h.get(T);return R!==void 0?++R.usedTimes:(R=new Xy(i,T,y,s),c.push(R),h.set(T,R)),R}function w(y){if(--y.usedTimes===0){let T=c.indexOf(y);c[T]=c[c.length-1],c.pop(),h.delete(y.cacheKey),y.destroy()}}function S(y){o.remove(y)}function A(){o.dispose()}return{getParameters:g,getProgramCacheKey:m,getUniforms:C,acquireProgram:M,releaseProgram:w,releaseShaderCache:S,programs:c,dispose:A}}function Yy(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Jy(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function rp(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function ap(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,x,g,m,p){let b=i[t];return b===void 0?(b={id:u.id,object:u,geometry:f,material:x,materialVariant:a(u),groupOrder:g,renderOrder:u.renderOrder,z:m,group:p},i[t]=b):(b.id=u.id,b.object=u,b.geometry=f,b.material=x,b.materialVariant=a(u),b.groupOrder=g,b.renderOrder=u.renderOrder,b.z=m,b.group=p),t++,b}function l(u,f,x,g,m,p,b){b.reversedDepth===!0&&(m=-m);let C=o(u,f,x,g,m,p);x.transmission>0?n.push(C):x.transparent===!0?s.push(C):e.push(C)}function c(u,f,x,g,m,p){let b=o(u,f,x,g,m,p);x.transmission>0?n.unshift(b):x.transparent===!0?s.unshift(b):e.unshift(b)}function h(u,f){e.length>1&&e.sort(u||Jy),n.length>1&&n.sort(f||rp),s.length>1&&s.sort(f||rp)}function d(){for(let u=t,f=i.length;u<f;u++){let x=i[u];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function Ky(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new ap,i.set(n,[a])):s>=r.length?(a=new ap,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function jy(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new At};break;case"SpotLight":e={position:new D,direction:new D,color:new At,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new At,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new At,groundColor:new At};break;case"RectAreaLight":e={color:new At,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function Qy(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var tv=0;function ev(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function nv(i){let t=new jy,e=Qy(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);let s=new D,r=new ue,a=new ue;function o(c){let h=0,d=0,u=0;for(let F=0;F<9;F++)n.probe[F].set(0,0,0);let f=0,x=0,g=0,m=0,p=0,b=0,C=0,M=0,w=0,S=0,A=0,y=0,T=0,R=0;c.sort(ev);for(let F=0,B=c.length;F<B;F++){let P=c[F],O=P.color,W=P.intensity,Z=P.distance,nt=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===Ti?nt=P.shadow.map.texture:nt=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)h+=O.r*W,d+=O.g*W,u+=O.b*W;else if(P.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(P.sh.coefficients[q],W);R++}else if(P.isSunLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let Q=P.shadow,et=e.get(P);et.shadowIntensity=Q.intensity,et.shadowBias=Q.bias,et.shadowNormalBias=Q.normalBias,et.shadowRadius=Q.radius,et.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),n.sunShadow[x]=et,n.sunShadowMap[x]=nt;let Pt=Q.getViewportCount();for(let Ct=0;Ct<Pt;Ct++)n.sunShadowMatrix[g+Ct]=Q.getMatrix(Ct),n.sunShadowCascade[g+Ct]=Q._cascadeData[Ct];g+=Pt,x++}n.sun[f]=q,f++}else if(P.isDirectionalLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let Q=P.shadow,et=e.get(P);et.shadowIntensity=Q.intensity,et.shadowBias=Q.bias,et.shadowNormalBias=Q.normalBias,et.shadowRadius=Q.radius,et.shadowMapSize=Q.mapSize,n.directionalShadow[m]=et,n.directionalShadowMap[m]=nt,n.directionalShadowMatrix[m]=P.shadow.matrix,w++}n.directional[m]=q,m++}else if(P.isSpotLight){let q=t.get(P);q.position.setFromMatrixPosition(P.matrixWorld),q.color.copy(O).multiplyScalar(W),q.distance=Z,q.coneCos=Math.cos(P.angle),q.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),q.decay=P.decay,n.spot[b]=q;let Q=P.shadow;if(P.map&&(n.spotLightMap[y]=P.map,y++,Q.updateMatrices(P),P.castShadow&&T++),n.spotLightMatrix[b]=Q.matrix,P.castShadow){let et=e.get(P);et.shadowIntensity=Q.intensity,et.shadowBias=Q.bias,et.shadowNormalBias=Q.normalBias,et.shadowRadius=Q.radius,et.shadowMapSize=Q.mapSize,n.spotShadow[b]=et,n.spotShadowMap[b]=nt,A++}b++}else if(P.isRectAreaLight){let q=t.get(P);q.color.copy(O).multiplyScalar(W),q.halfWidth.set(P.width*.5,0,0),q.halfHeight.set(0,P.height*.5,0),n.rectArea[C]=q,C++}else if(P.isPointLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),q.distance=P.distance,q.decay=P.decay,P.castShadow){let Q=P.shadow,et=e.get(P);et.shadowIntensity=Q.intensity,et.shadowBias=Q.bias,et.shadowNormalBias=Q.normalBias,et.shadowRadius=Q.radius,et.shadowMapSize=Q.mapSize,et.shadowCameraNear=Q.camera.near,et.shadowCameraFar=Q.camera.far,n.pointShadow[p]=et,n.pointShadowMap[p]=nt,n.pointShadowMatrix[p]=P.shadow.matrix,S++}n.point[p]=q,p++}else if(P.isHemisphereLight){let q=t.get(P);q.skyColor.copy(P.color).multiplyScalar(W),q.groundColor.copy(P.groundColor).multiplyScalar(W),n.hemi[M]=q,M++}}C>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ut.LTC_FLOAT_1,n.rectAreaLTC2=ut.LTC_FLOAT_2):(n.rectAreaLTC1=ut.LTC_HALF_1,n.rectAreaLTC2=ut.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let U=n.hash;(U.sunLength!==f||U.directionalLength!==m||U.pointLength!==p||U.spotLength!==b||U.rectAreaLength!==C||U.hemiLength!==M||U.numSunShadows!==x||U.numDirectionalShadows!==w||U.numPointShadows!==S||U.numSpotShadows!==A||U.numSpotMaps!==y||U.numLightProbes!==R)&&(n.sun.length=f,n.directional.length=m,n.spot.length=b,n.rectArea.length=C,n.point.length=p,n.hemi.length=M,n.sunShadow.length=x,n.sunShadowMap.length=x,n.sunShadowMatrix.length=g,n.sunShadowCascade.length=g,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.directionalShadowMatrix.length=w,n.pointShadow.length=S,n.pointShadowMap.length=S,n.pointShadowMatrix.length=S,n.spotShadow.length=A,n.spotShadowMap.length=A,n.spotLightMatrix.length=A+y-T,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=R,U.sunLength=f,U.directionalLength=m,U.pointLength=p,U.spotLength=b,U.rectAreaLength=C,U.hemiLength=M,U.numSunShadows=x,U.numDirectionalShadows=w,U.numPointShadows=S,U.numSpotShadows=A,U.numSpotMaps=y,U.numLightProbes=R,n.version=tv++)}function l(c,h){let d=0,u=0,f=0,x=0,g=0,m=0,p=h.matrixWorldInverse;for(let b=0,C=c.length;b<C;b++){let M=c[b];if(M.isSunLight){let w=n.sun[d];w.direction.setFromMatrixPosition(M.matrixWorld),w.direction.transformDirection(p),d++}else if(M.isDirectionalLight){let w=n.directional[u];w.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(p),u++}else if(M.isSpotLight){let w=n.spot[x];w.position.setFromMatrixPosition(M.matrixWorld),w.position.applyMatrix4(p),w.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(p),x++}else if(M.isRectAreaLight){let w=n.rectArea[g];w.position.setFromMatrixPosition(M.matrixWorld),w.position.applyMatrix4(p),a.identity(),r.copy(M.matrixWorld),r.premultiply(p),a.extractRotation(r),w.halfWidth.set(M.width*.5,0,0),w.halfHeight.set(0,M.height*.5,0),w.halfWidth.applyMatrix4(a),w.halfHeight.applyMatrix4(a),g++}else if(M.isPointLight){let w=n.point[f];w.position.setFromMatrixPosition(M.matrixWorld),w.position.applyMatrix4(p),f++}else if(M.isHemisphereLight){let w=n.hemi[m];w.direction.setFromMatrixPosition(M.matrixWorld),w.direction.transformDirection(p),m++}}}return{setup:o,setupView:l,state:n}}function op(i){let t=new nv(i),e=[],n=[],s=[];function r(u){d.camera=u,e.length=0,n.length=0,s.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function iv(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new op(i),t.set(s,[o])):r>=a.length?(o=new op(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var sv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,rv=`uniform sampler2D shadow_pass;
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
}`,av=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],ov=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],lp=new ue,ma=new D,$h=new D;function lv(i,t,e){let n=new Fs,s=new bt,r=new bt,a=new me,o=new Uo,l=new Fo,c={},h=e.maxTextureSize,d={[Mi]:tn,[tn]:Mi,[an]:an},u=new Se({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new bt},radius:{value:4}},vertexShader:sv,fragmentShader:rv}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let x=new _e;x.setAttribute("position",new Oe(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new Nt(x,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Gi;let p=this.type;this.render=function(S,A,y){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||S.length===0)return;this.type===nf&&(Dt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Gi);let T=i.getRenderTarget(),R=i.getActiveCubeFace(),U=i.getActiveMipmapLevel(),F=i.state;F.setBlending(xn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let B=p!==this.type;B&&A.traverse(function(P){P.material&&(Array.isArray(P.material)?P.material.forEach(O=>O.needsUpdate=!0):P.material.needsUpdate=!0)});for(let P=0,O=S.length;P<O;P++){let W=S[P],Z=W.shadow;if(Z===void 0){Dt("WebGLShadowMap:",W,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;s.copy(Z.mapSize);let nt=Z.getFrameExtents();s.multiply(nt),r.copy(Z.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/nt.x),s.x=r.x*nt.x,Z.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/nt.y),s.y=r.y*nt.y,Z.mapSize.y=r.y));let q=i.state.buffers.depth.getReversed();if(Z.camera._reversedDepth=q,Z.map===null||B===!0){if(Z.map!==null&&(Z.map.depthTexture!==null&&(Z.map.depthTexture.dispose(),Z.map.depthTexture=null),Z.map.dispose()),this.type===Gs){if(W.isPointLight){Dt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Z.map=new ye(s.x,s.y,{format:Ti,type:Le,minFilter:Ve,magFilter:Ve,generateMipmaps:!1}),Z.map.texture.name=W.name+".shadowMap",Z.map.depthTexture=new xi(s.x,s.y,Pn),Z.map.depthTexture.name=W.name+".shadowMapDepth",Z.map.depthTexture.format=Fn,Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Be,Z.map.depthTexture.magFilter=Be}else W.isPointLight?(Z.map=new Ol(s.x),Z.map.depthTexture=new No(s.x,Rn)):(Z.map=new ye(s.x,s.y),Z.map.depthTexture=new xi(s.x,s.y,Rn)),Z.map.depthTexture.name=W.name+".shadowMap",Z.map.depthTexture.format=Fn,this.type===Gi?(Z.map.depthTexture.compareFunction=q?Ul:Nl,Z.map.depthTexture.minFilter=Ve,Z.map.depthTexture.magFilter=Ve):(Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Be,Z.map.depthTexture.magFilter=Be);Z.camera.updateProjectionMatrix()}Z.map.isWebGLCubeRenderTarget!==!0&&(Z.map.width!==s.x||Z.map.height!==s.y)&&Z.map.setSize(s.x,s.y);let Q=Z.map.isWebGLCubeRenderTarget?6:Z.getViewportCount();W.isPointLight!==!0&&Z.updateMatrices(W,y);for(let et=0;et<Q;et++){let Pt=Z.getCamera(et);if(W.isPointLight){let Ct=Z.camera,oe=Z.matrix,Zt=W.distance||Ct.far;Zt!==Ct.far&&(Ct.far=Zt,Ct.updateProjectionMatrix()),ma.setFromMatrixPosition(W.matrixWorld),Ct.position.copy(ma),$h.copy(Ct.position),$h.add(av[et]),Ct.up.copy(ov[et]),Ct.lookAt($h),Ct.updateMatrixWorld(),oe.makeTranslation(-ma.x,-ma.y,-ma.z),lp.multiplyMatrices(Ct.projectionMatrix,Ct.matrixWorldInverse),Z._frustum.setFromProjectionMatrix(lp,Ct.coordinateSystem,Ct.reversedDepth)}if(Z.map.isWebGLCubeRenderTarget)i.setRenderTarget(Z.map,et),i.clear();else{et===0&&(i.setRenderTarget(Z.map),i.clear());let Ct=Z.getViewport(et);a.set(r.x*Ct.x,r.y*Ct.y,r.x*Ct.z,r.y*Ct.w),F.viewport(a)}n=Z.getFrustum(et),M(A,y,Pt,W,this.type)}Z.isPointLightShadow!==!0&&this.type===Gs&&b(Z,y),Z.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(T,R,U)};function b(S,A){let y=t.update(g);u.defines.VSM_SAMPLES!==S.blurSamples&&(u.defines.VSM_SAMPLES=S.blurSamples,f.defines.VSM_SAMPLES=S.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),S.mapPass===null?S.mapPass=new ye(s.x,s.y,{format:Ti,type:Le}):(S.mapPass.width!==S.map.width||S.mapPass.height!==S.map.height)&&S.mapPass.setSize(S.map.width,S.map.height),u.uniforms.shadow_pass.value=S.map.depthTexture,u.uniforms.resolution.value.set(S.map.width,S.map.height),u.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(A,null,y,u,g,null),f.uniforms.shadow_pass.value=S.mapPass.texture,f.uniforms.resolution.value.set(S.map.width,S.map.height),f.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(A,null,y,f,g,null)}function C(S,A,y,T){let R=null,U=y.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(U!==void 0)R=U;else if(R=y.isPointLight===!0?l:o,i.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let F=R.uuid,B=A.uuid,P=c[F];P===void 0&&(P={},c[F]=P);let O=P[B];O===void 0&&(O=R.clone(),P[B]=O,A.addEventListener("dispose",w)),R=O}if(R.visible=A.visible,R.wireframe=A.wireframe,T===Gs?R.side=A.shadowSide!==null?A.shadowSide:A.side:R.side=A.shadowSide!==null?A.shadowSide:d[A.side],R.alphaMap=A.alphaMap,R.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,R.map=A.map,R.clipShadows=A.clipShadows,R.clippingPlanes=A.clippingPlanes,R.clipIntersection=A.clipIntersection,R.displacementMap=A.displacementMap,R.displacementScale=A.displacementScale,R.displacementBias=A.displacementBias,R.wireframeLinewidth=A.wireframeLinewidth,R.linewidth=A.linewidth,y.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let F=i.properties.get(R);F.light=y}return R}function M(S,A,y,T,R){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&R===Gs)&&(!S.frustumCulled||S.intersectsFrustum(n))){S.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,S.matrixWorld);let B=t.update(S),P=S.material;if(Array.isArray(P)){let O=B.groups;for(let W=0,Z=O.length;W<Z;W++){let nt=O[W],q=P[nt.materialIndex];if(q&&q.visible){let Q=C(S,q,T,R);S.onBeforeShadow(i,S,A,y,B,Q,nt),i.renderBufferDirect(y,null,B,Q,S,nt),S.onAfterShadow(i,S,A,y,B,Q,nt)}}}else if(P.visible){let O=C(S,P,T,R);S.onBeforeShadow(i,S,A,y,B,O,null),i.renderBufferDirect(y,null,B,O,S,null),S.onAfterShadow(i,S,A,y,B,O,null)}}let F=S.children;for(let B=0,P=F.length;B<P;B++)M(F[B],A,y,T,R)}function w(S){S.target.removeEventListener("dispose",w);for(let y in c){let T=c[y],R=S.target.uuid;R in T&&(T[R].dispose(),delete T[R])}}}function cv(i,t){function e(){let L=!1,lt=new me,J=null,ct=new me(0,0,0,0);return{setMask:function(pt){J!==pt&&!L&&(i.colorMask(pt,pt,pt,pt),J=pt)},setLocked:function(pt){L=pt},setClear:function(pt,tt,Rt,St,ce){ce===!0&&(pt*=St,tt*=St,Rt*=St),lt.set(pt,tt,Rt,St),ct.equals(lt)===!1&&(i.clearColor(pt,tt,Rt,St),ct.copy(lt))},reset:function(){L=!1,J=null,ct.set(-1,0,0,0)}}}function n(){let L=!1,lt=!1,J=null,ct=null,pt=null;return{setReversed:function(tt){if(lt!==tt){let Rt=t.get("EXT_clip_control");tt?Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.ZERO_TO_ONE_EXT):Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.NEGATIVE_ONE_TO_ONE_EXT),lt=tt;let St=pt;pt=null,this.setClear(St)}},getReversed:function(){return lt},setTest:function(tt){tt?j(i.DEPTH_TEST):yt(i.DEPTH_TEST)},setMask:function(tt){J!==tt&&!L&&(i.depthMask(tt),J=tt)},setFunc:function(tt){if(lt&&(tt=kf[tt]),ct!==tt){switch(tt){case yo:i.depthFunc(i.NEVER);break;case vo:i.depthFunc(i.ALWAYS);break;case Mo:i.depthFunc(i.LESS);break;case Rs:i.depthFunc(i.LEQUAL);break;case bo:i.depthFunc(i.EQUAL);break;case So:i.depthFunc(i.GEQUAL);break;case wo:i.depthFunc(i.GREATER);break;case To:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ct=tt}},setLocked:function(tt){L=tt},setClear:function(tt){pt!==tt&&(pt=tt,lt&&(tt=1-tt),i.clearDepth(tt))},reset:function(){L=!1,J=null,ct=null,pt=null,lt=!1}}}function s(){let L=!1,lt=null,J=null,ct=null,pt=null,tt=null,Rt=null,St=null,ce=null;return{setTest:function(Qt){L||(Qt?j(i.STENCIL_TEST):yt(i.STENCIL_TEST))},setMask:function(Qt){lt!==Qt&&!L&&(i.stencilMask(Qt),lt=Qt)},setFunc:function(Qt,Mn,In){(J!==Qt||ct!==Mn||pt!==In)&&(i.stencilFunc(Qt,Mn,In),J=Qt,ct=Mn,pt=In)},setOp:function(Qt,Mn,In){(tt!==Qt||Rt!==Mn||St!==In)&&(i.stencilOp(Qt,Mn,In),tt=Qt,Rt=Mn,St=In)},setLocked:function(Qt){L=Qt},setClear:function(Qt){ce!==Qt&&(i.clearStencil(Qt),ce=Qt)},reset:function(){L=!1,lt=null,J=null,ct=null,pt=null,tt=null,Rt=null,St=null,ce=null}}}let r=new e,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,x=[],g=null,m=!1,p=null,b=null,C=null,M=null,w=null,S=null,A=null,y=new At(0,0,0),T=0,R=!1,U=null,F=null,B=null,P=null,O=null,W=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Z=!1,nt=0,q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(nt=parseFloat(/^WebGL (\d)/.exec(q)[1]),Z=nt>=1):q.indexOf("OpenGL ES")!==-1&&(nt=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),Z=nt>=2);let Q=null,et={},Pt=i.getParameter(i.SCISSOR_BOX),Ct=i.getParameter(i.VIEWPORT),oe=new me().fromArray(Pt),Zt=new me().fromArray(Ct);function Kt(L,lt,J,ct){let pt=new Uint8Array(4),tt=i.createTexture();i.bindTexture(L,tt),i.texParameteri(L,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(L,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Rt=0;Rt<J;Rt++)L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY?i.texImage3D(lt,0,i.RGBA,1,1,ct,0,i.RGBA,i.UNSIGNED_BYTE,pt):i.texImage2D(lt+Rt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,pt);return tt}let $={};$[i.TEXTURE_2D]=Kt(i.TEXTURE_2D,i.TEXTURE_2D,1),$[i.TEXTURE_CUBE_MAP]=Kt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),$[i.TEXTURE_2D_ARRAY]=Kt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),$[i.TEXTURE_3D]=Kt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),j(i.DEPTH_TEST),a.setFunc(Rs),Wt(!1),pe(Sh),j(i.CULL_FACE),Yt(xn);function j(L){h[L]!==!0&&(i.enable(L),h[L]=!0)}function yt(L){h[L]!==!1&&(i.disable(L),h[L]=!1)}function Ft(L,lt){return u[L]!==lt?(i.bindFramebuffer(L,lt),u[L]=lt,L===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=lt),L===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=lt),!0):!1}function gt(L,lt){let J=x,ct=!1;if(L){J=f.get(lt),J===void 0&&(J=[],f.set(lt,J));let pt=L.textures;if(J.length!==pt.length||J[0]!==i.COLOR_ATTACHMENT0){for(let tt=0,Rt=pt.length;tt<Rt;tt++)J[tt]=i.COLOR_ATTACHMENT0+tt;J.length=pt.length,ct=!0}}else J[0]!==i.BACK&&(J[0]=i.BACK,ct=!0);ct&&i.drawBuffers(J)}function zt(L){return g!==L?(i.useProgram(L),g=L,!0):!1}let Ce={[Wi]:i.FUNC_ADD,[rf]:i.FUNC_SUBTRACT,[af]:i.FUNC_REVERSE_SUBTRACT};Ce[of]=i.MIN,Ce[lf]=i.MAX;let Vt={[cf]:i.ZERO,[hf]:i.ONE,[uf]:i.SRC_COLOR,[Eh]:i.SRC_ALPHA,[xf]:i.SRC_ALPHA_SATURATE,[mf]:i.DST_COLOR,[ff]:i.DST_ALPHA,[df]:i.ONE_MINUS_SRC_COLOR,[Ah]:i.ONE_MINUS_SRC_ALPHA,[gf]:i.ONE_MINUS_DST_COLOR,[pf]:i.ONE_MINUS_DST_ALPHA,[_f]:i.CONSTANT_COLOR,[yf]:i.ONE_MINUS_CONSTANT_COLOR,[vf]:i.CONSTANT_ALPHA,[Mf]:i.ONE_MINUS_CONSTANT_ALPHA};function Yt(L,lt,J,ct,pt,tt,Rt,St,ce,Qt){if(L===xn){m===!0&&(yt(i.BLEND),m=!1);return}if(m===!1&&(j(i.BLEND),m=!0),L!==sf){if(L!==p||Qt!==R){if((b!==Wi||w!==Wi)&&(i.blendEquation(i.FUNC_ADD),b=Wi,w=Wi),Qt)switch(L){case bi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _n:i.blendFunc(i.ONE,i.ONE);break;case wh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Th:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Lt("WebGLState: Invalid blending: ",L);break}else switch(L){case bi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _n:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case wh:Lt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Th:Lt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Lt("WebGLState: Invalid blending: ",L);break}C=null,M=null,S=null,A=null,y.set(0,0,0),T=0,p=L,R=Qt}return}pt=pt||lt,tt=tt||J,Rt=Rt||ct,(lt!==b||pt!==w)&&(i.blendEquationSeparate(Ce[lt],Ce[pt]),b=lt,w=pt),(J!==C||ct!==M||tt!==S||Rt!==A)&&(i.blendFuncSeparate(Vt[J],Vt[ct],Vt[tt],Vt[Rt]),C=J,M=ct,S=tt,A=Rt),(St.equals(y)===!1||ce!==T)&&(i.blendColor(St.r,St.g,St.b,ce),y.copy(St),T=ce),p=L,R=!1}function le(L,lt){L.side===an?yt(i.CULL_FACE):j(i.CULL_FACE);let J=L.side===tn;lt&&(J=!J),Wt(J),L.blending===bi&&L.transparent===!1?Yt(xn):Yt(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),a.setFunc(L.depthFunc),a.setTest(L.depthTest),a.setMask(L.depthWrite),r.setMask(L.colorWrite);let ct=L.stencilWrite;o.setTest(ct),ct&&(o.setMask(L.stencilWriteMask),o.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),o.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),nn(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?j(i.SAMPLE_ALPHA_TO_COVERAGE):yt(i.SAMPLE_ALPHA_TO_COVERAGE)}function Wt(L){U!==L&&(L?i.frontFace(i.CW):i.frontFace(i.CCW),U=L)}function pe(L){L!==tf?(j(i.CULL_FACE),L!==F&&(L===Sh?i.cullFace(i.BACK):L===ef?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):yt(i.CULL_FACE),F=L}function Ue(L){L!==B&&(Z&&i.lineWidth(L),B=L)}function nn(L,lt,J){L?(j(i.POLYGON_OFFSET_FILL),(P!==lt||O!==J)&&(P=lt,O=J,a.getReversed()&&(lt=-lt),i.polygonOffset(lt,J))):yt(i.POLYGON_OFFSET_FILL)}function xe(L){L?j(i.SCISSOR_TEST):yt(i.SCISSOR_TEST)}function we(L){L===void 0&&(L=i.TEXTURE0+W-1),Q!==L&&(i.activeTexture(L),Q=L)}function N(L,lt,J){J===void 0&&(Q===null?J=i.TEXTURE0+W-1:J=Q);let ct=et[J];ct===void 0&&(ct={type:void 0,texture:void 0},et[J]=ct),(ct.type!==L||ct.texture!==lt)&&(Q!==J&&(i.activeTexture(J),Q=J),i.bindTexture(L,lt||$[L]),ct.type=L,ct.texture=lt)}function Ze(){let L=et[Q];L!==void 0&&L.type!==void 0&&(i.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function ne(){try{i.compressedTexImage2D(...arguments)}catch(L){Lt("WebGLState:",L)}}function E(){try{i.compressedTexImage3D(...arguments)}catch(L){Lt("WebGLState:",L)}}function _(){try{i.texSubImage2D(...arguments)}catch(L){Lt("WebGLState:",L)}}function k(){try{i.texSubImage3D(...arguments)}catch(L){Lt("WebGLState:",L)}}function V(){try{i.compressedTexSubImage2D(...arguments)}catch(L){Lt("WebGLState:",L)}}function X(){try{i.compressedTexSubImage3D(...arguments)}catch(L){Lt("WebGLState:",L)}}function it(){try{i.texStorage2D(...arguments)}catch(L){Lt("WebGLState:",L)}}function rt(){try{i.texStorage3D(...arguments)}catch(L){Lt("WebGLState:",L)}}function Y(){try{i.texImage2D(...arguments)}catch(L){Lt("WebGLState:",L)}}function K(){try{i.texImage3D(...arguments)}catch(L){Lt("WebGLState:",L)}}function at(L){return d[L]!==void 0?d[L]:i.getParameter(L)}function Tt(L,lt){d[L]!==lt&&(i.pixelStorei(L,lt),d[L]=lt)}function ht(L){oe.equals(L)===!1&&(i.scissor(L.x,L.y,L.z,L.w),oe.copy(L))}function ot(L){Zt.equals(L)===!1&&(i.viewport(L.x,L.y,L.z,L.w),Zt.copy(L))}function Et(L,lt){let J=c.get(lt);J===void 0&&(J=new WeakMap,c.set(lt,J));let ct=J.get(L);ct===void 0&&(ct=i.getUniformBlockIndex(lt,L.name),J.set(L,ct))}function It(L,lt){let ct=c.get(lt).get(L);l.get(lt)!==ct&&(i.uniformBlockBinding(lt,ct,L.__bindingPointIndex),l.set(lt,ct))}function kt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},Q=null,et={},u={},f=new WeakMap,x=[],g=null,m=!1,p=null,b=null,C=null,M=null,w=null,S=null,A=null,y=new At(0,0,0),T=0,R=!1,U=null,F=null,B=null,P=null,O=null,oe.set(0,0,i.canvas.width,i.canvas.height),Zt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:j,disable:yt,bindFramebuffer:Ft,drawBuffers:gt,useProgram:zt,setBlending:Yt,setMaterial:le,setFlipSided:Wt,setCullFace:pe,setLineWidth:Ue,setPolygonOffset:nn,setScissorTest:xe,activeTexture:we,bindTexture:N,unbindTexture:Ze,compressedTexImage2D:ne,compressedTexImage3D:E,texImage2D:Y,texImage3D:K,pixelStorei:Tt,getParameter:at,updateUBOMapping:Et,uniformBlockBinding:It,texStorage2D:it,texStorage3D:rt,texSubImage2D:_,texSubImage3D:k,compressedTexSubImage2D:V,compressedTexSubImage3D:X,scissor:ht,viewport:ot,reset:kt}}function hv(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new bt,h=new WeakMap,d=new Set,u,f=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,_){return x?new OffscreenCanvas(E,_):Dr("canvas")}function m(E,_,k){let V=1,X=ne(E);if((X.width>k||X.height>k)&&(V=k/Math.max(X.width,X.height)),V<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){let it=Math.floor(V*X.width),rt=Math.floor(V*X.height);u===void 0&&(u=g(it,rt));let Y=_?g(it,rt):u;return Y.width=it,Y.height=rt,Y.getContext("2d").drawImage(E,0,0,it,rt),Dt("WebGLRenderer: Texture has been resized from ("+X.width+"x"+X.height+") to ("+it+"x"+rt+")."),Y}else return"data"in E&&Dt("WebGLRenderer: Image in DataTexture is too big ("+X.width+"x"+X.height+")."),E;return E}function p(E){return E.generateMipmaps}function b(E){i.generateMipmap(E)}function C(E){return E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?i.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function M(E,_,k,V,X,it=!1){if(E!==null){if(i[E]!==void 0)return i[E];Dt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let rt;V&&(rt=t.get("EXT_texture_norm16"),rt||Dt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=_;if(_===i.RED&&(k===i.FLOAT&&(Y=i.R32F),k===i.HALF_FLOAT&&(Y=i.R16F),k===i.UNSIGNED_BYTE&&(Y=i.R8),k===i.UNSIGNED_SHORT&&rt&&(Y=rt.R16_EXT),k===i.SHORT&&rt&&(Y=rt.R16_SNORM_EXT)),_===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&(Y=i.R8UI),k===i.UNSIGNED_SHORT&&(Y=i.R16UI),k===i.UNSIGNED_INT&&(Y=i.R32UI),k===i.BYTE&&(Y=i.R8I),k===i.SHORT&&(Y=i.R16I),k===i.INT&&(Y=i.R32I)),_===i.RG&&(k===i.FLOAT&&(Y=i.RG32F),k===i.HALF_FLOAT&&(Y=i.RG16F),k===i.UNSIGNED_BYTE&&(Y=i.RG8),k===i.UNSIGNED_SHORT&&rt&&(Y=rt.RG16_EXT),k===i.SHORT&&rt&&(Y=rt.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&(Y=i.RG8UI),k===i.UNSIGNED_SHORT&&(Y=i.RG16UI),k===i.UNSIGNED_INT&&(Y=i.RG32UI),k===i.BYTE&&(Y=i.RG8I),k===i.SHORT&&(Y=i.RG16I),k===i.INT&&(Y=i.RG32I)),_===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),k===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),k===i.UNSIGNED_INT&&(Y=i.RGB32UI),k===i.BYTE&&(Y=i.RGB8I),k===i.SHORT&&(Y=i.RGB16I),k===i.INT&&(Y=i.RGB32I)),_===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),k===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),k===i.UNSIGNED_INT&&(Y=i.RGBA32UI),k===i.BYTE&&(Y=i.RGBA8I),k===i.SHORT&&(Y=i.RGBA16I),k===i.INT&&(Y=i.RGBA32I)),_===i.RGB&&(k===i.UNSIGNED_SHORT&&rt&&(Y=rt.RGB16_EXT),k===i.SHORT&&rt&&(Y=rt.RGB16_SNORM_EXT),k===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),k===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),_===i.RGBA){let K=it?Lr:Ht.getTransfer(X);k===i.FLOAT&&(Y=i.RGBA32F),k===i.HALF_FLOAT&&(Y=i.RGBA16F),k===i.UNSIGNED_BYTE&&(Y=K===Jt?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT&&rt&&(Y=rt.RGBA16_EXT),k===i.SHORT&&rt&&(Y=rt.RGBA16_SNORM_EXT),k===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function w(E,_){let k;return E?_===null||_===Rn||_===Zs?k=i.DEPTH24_STENCIL8:_===Pn?k=i.DEPTH32F_STENCIL8:_===Xs&&(k=i.DEPTH24_STENCIL8,Dt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Rn||_===Zs?k=i.DEPTH_COMPONENT24:_===Pn?k=i.DEPTH_COMPONENT32F:_===Xs&&(k=i.DEPTH_COMPONENT16),k}function S(E,_){return p(E)===!0||E.isFramebufferTexture&&E.minFilter!==Be&&E.minFilter!==Ve?Math.log2(Math.max(_.width,_.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?_.mipmaps.length:1}function A(E){let _=E.target;_.removeEventListener("dispose",A),T(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function y(E){let _=E.target;_.removeEventListener("dispose",y),U(_)}function T(E){let _=n.get(E);if(_.__webglInit===void 0)return;let k=E.source,V=f.get(k);if(V){let X=V[_.__cacheKey];X.usedTimes--,X.usedTimes===0&&R(E),Object.keys(V).length===0&&f.delete(k)}n.remove(E)}function R(E){let _=n.get(E);i.deleteTexture(_.__webglTexture);let k=E.source,V=f.get(k);delete V[_.__cacheKey],a.memory.textures--}function U(E){let _=n.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),n.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(_.__webglFramebuffer[V]))for(let X=0;X<_.__webglFramebuffer[V].length;X++)i.deleteFramebuffer(_.__webglFramebuffer[V][X]);else i.deleteFramebuffer(_.__webglFramebuffer[V]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[V])}else{if(Array.isArray(_.__webglFramebuffer))for(let V=0;V<_.__webglFramebuffer.length;V++)i.deleteFramebuffer(_.__webglFramebuffer[V]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let V=0;V<_.__webglColorRenderbuffer.length;V++)_.__webglColorRenderbuffer[V]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[V]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let k=E.textures;for(let V=0,X=k.length;V<X;V++){let it=n.get(k[V]);it.__webglTexture&&(i.deleteTexture(it.__webglTexture),a.memory.textures--),n.remove(k[V])}n.remove(E)}let F=0;function B(){F=0}function P(){return F}function O(E){F=E}function W(){let E=F;return E>=s.maxTextures&&Dt("WebGLTextures: Trying to use "+(E+1)+" texture units while this GPU supports only "+s.maxTextures),F+=1,E}function Z(E){let _=[];return _.push(E.wrapS),_.push(E.wrapT),_.push(E.wrapR||0),_.push(E.magFilter),_.push(E.minFilter),_.push(E.anisotropy),_.push(E.internalFormat),_.push(E.format),_.push(E.type),_.push(E.generateMipmaps),_.push(E.premultiplyAlpha),_.push(E.flipY),_.push(E.unpackAlignment),_.push(E.colorSpace),_.join()}function nt(E,_){let k=n.get(E);if(E.isVideoTexture&&N(E),E.isRenderTargetTexture===!1&&E.isExternalTexture!==!0&&E.version>0&&k.__version!==E.version){let V=E.image;if(V===null)Dt("WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)Dt("WebGLRenderer: Texture marked for update but image is incomplete");else{yt(k,E,_);return}}else E.isExternalTexture&&(k.__webglTexture=E.sourceTexture?E.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+_)}function q(E,_){let k=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&k.__version!==E.version){yt(k,E,_);return}else E.isExternalTexture&&(k.__webglTexture=E.sourceTexture?E.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+_)}function Q(E,_){let k=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&k.__version!==E.version){yt(k,E,_);return}e.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+_)}function et(E,_){let k=n.get(E);if(E.isCubeDepthTexture!==!0&&E.version>0&&k.__version!==E.version){Ft(k,E,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+_)}let Pt={[Eo]:i.REPEAT,[Un]:i.CLAMP_TO_EDGE,[Ao]:i.MIRRORED_REPEAT},Ct={[Be]:i.NEAREST,[wf]:i.NEAREST_MIPMAP_NEAREST,[oa]:i.NEAREST_MIPMAP_LINEAR,[Ve]:i.LINEAR,[Jo]:i.LINEAR_MIPMAP_NEAREST,[Hn]:i.LINEAR_MIPMAP_LINEAR},oe={[Cf]:i.NEVER,[Df]:i.ALWAYS,[Rf]:i.LESS,[Nl]:i.LEQUAL,[Pf]:i.EQUAL,[Ul]:i.GEQUAL,[If]:i.GREATER,[Lf]:i.NOTEQUAL};function Zt(E,_){if(_.type===Pn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===Ve||_.magFilter===Jo||_.magFilter===oa||_.magFilter===Hn||_.minFilter===Ve||_.minFilter===Jo||_.minFilter===oa||_.minFilter===Hn)&&Dt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(E,i.TEXTURE_WRAP_S,Pt[_.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,Pt[_.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,Pt[_.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,Ct[_.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,Ct[_.minFilter]),_.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,oe[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Be||_.minFilter!==oa&&_.minFilter!==Hn||_.type===Pn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let k=t.get("EXT_texture_filter_anisotropic");i.texParameterf(E,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Kt(E,_){let k=!1;E.__webglInit===void 0&&(E.__webglInit=!0,_.addEventListener("dispose",A));let V=_.source,X=f.get(V);X===void 0&&(X={},f.set(V,X));let it=Z(_);if(it!==E.__cacheKey){X[it]===void 0&&(X[it]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,k=!0),X[it].usedTimes++;let rt=X[E.__cacheKey];rt!==void 0&&(X[E.__cacheKey].usedTimes--,rt.usedTimes===0&&R(_)),E.__cacheKey=it,E.__webglTexture=X[it].texture}return k}function $(E,_,k){return Math.floor(Math.floor(E/k)/_)}function j(E,_,k,V){let it=E.updateRanges;if(it.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,k,V,_.data);else{it.sort((Tt,ht)=>Tt.start-ht.start);let rt=0;for(let Tt=1;Tt<it.length;Tt++){let ht=it[rt],ot=it[Tt],Et=ht.start+ht.count,It=$(ot.start,_.width,4),kt=$(ht.start,_.width,4);ot.start<=Et+1&&It===kt&&$(ot.start+ot.count-1,_.width,4)===It?ht.count=Math.max(ht.count,ot.start+ot.count-ht.start):(++rt,it[rt]=ot)}it.length=rt+1;let Y=e.getParameter(i.UNPACK_ROW_LENGTH),K=e.getParameter(i.UNPACK_SKIP_PIXELS),at=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Tt=0,ht=it.length;Tt<ht;Tt++){let ot=it[Tt],Et=Math.floor(ot.start/4),It=Math.ceil(ot.count/4),kt=Et%_.width,L=Math.floor(Et/_.width),lt=It,J=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,kt),e.pixelStorei(i.UNPACK_SKIP_ROWS,L),e.texSubImage2D(i.TEXTURE_2D,0,kt,L,lt,J,k,V,_.data)}E.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,Y),e.pixelStorei(i.UNPACK_SKIP_PIXELS,K),e.pixelStorei(i.UNPACK_SKIP_ROWS,at)}}function yt(E,_,k){let V=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(V=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(V=i.TEXTURE_3D);let X=Kt(E,_),it=_.source;e.bindTexture(V,E.__webglTexture,i.TEXTURE0+k);let rt=n.get(it);if(it.version!==rt.__version||X===!0){if(e.activeTexture(i.TEXTURE0+k),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let J=Ht.getPrimaries(Ht.workingColorSpace),ct=_.colorSpace===Qn?null:Ht.getPrimaries(_.colorSpace),pt=_.colorSpace===Qn||J===ct?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,pt)}e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let K=m(_.image,!1,s.maxTextureSize);K=Ze(_,K);let at=r.convert(_.format,_.colorSpace),Tt=r.convert(_.type),ht=M(_.internalFormat,at,Tt,_.normalized,_.colorSpace,_.isVideoTexture);Zt(V,_);let ot,Et=_.mipmaps,It=_.isVideoTexture!==!0,kt=rt.__version===void 0||X===!0,L=it.dataReady,lt=S(_,K);if(_.isDepthTexture)ht=w(_.format===wi,_.type),kt&&(It?e.texStorage2D(i.TEXTURE_2D,1,ht,K.width,K.height):e.texImage2D(i.TEXTURE_2D,0,ht,K.width,K.height,0,at,Tt,null));else if(_.isDataTexture)if(Et.length>0){It&&kt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,Et[0].width,Et[0].height);for(let J=0,ct=Et.length;J<ct;J++)ot=Et[J],It?L&&e.texSubImage2D(i.TEXTURE_2D,J,0,0,ot.width,ot.height,at,Tt,ot.data):e.texImage2D(i.TEXTURE_2D,J,ht,ot.width,ot.height,0,at,Tt,ot.data);_.generateMipmaps=!1}else It?(kt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,K.width,K.height),L&&j(_,K,at,Tt)):e.texImage2D(i.TEXTURE_2D,0,ht,K.width,K.height,0,at,Tt,K.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){It&&kt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,lt,ht,Et[0].width,Et[0].height,K.depth);for(let J=0,ct=Et.length;J<ct;J++)if(ot=Et[J],_.format!==yn)if(at!==null)if(It){if(L)if(_.layerUpdates.size>0){let pt=Vh(ot.width,ot.height,_.format,_.type);for(let tt of _.layerUpdates){let Rt=ot.data.subarray(tt*pt/ot.data.BYTES_PER_ELEMENT,(tt+1)*pt/ot.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,J,0,0,tt,ot.width,ot.height,1,at,Rt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,J,0,0,0,ot.width,ot.height,K.depth,at,ot.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,J,ht,ot.width,ot.height,K.depth,0,ot.data,0,0);else Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else It?L&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,J,0,0,0,ot.width,ot.height,K.depth,at,Tt,ot.data):e.texImage3D(i.TEXTURE_2D_ARRAY,J,ht,ot.width,ot.height,K.depth,0,at,Tt,ot.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{It&&kt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,Et[0].width,Et[0].height);for(let J=0,ct=Et.length;J<ct;J++)ot=Et[J],_.format!==yn?at!==null?It?L&&e.compressedTexSubImage2D(i.TEXTURE_2D,J,0,0,ot.width,ot.height,at,ot.data):e.compressedTexImage2D(i.TEXTURE_2D,J,ht,ot.width,ot.height,0,ot.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):It?L&&e.texSubImage2D(i.TEXTURE_2D,J,0,0,ot.width,ot.height,at,Tt,ot.data):e.texImage2D(i.TEXTURE_2D,J,ht,ot.width,ot.height,0,at,Tt,ot.data)}else if(_.isDataArrayTexture)if(It){if(kt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,lt,ht,K.width,K.height,K.depth),L)if(_.layerUpdates.size>0){let J=Vh(K.width,K.height,_.format,_.type);for(let ct of _.layerUpdates){let pt=K.data.subarray(ct*J/K.data.BYTES_PER_ELEMENT,(ct+1)*J/K.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ct,K.width,K.height,1,at,Tt,pt)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,at,Tt,K.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,ht,K.width,K.height,K.depth,0,at,Tt,K.data);else if(_.isData3DTexture)It?(kt&&e.texStorage3D(i.TEXTURE_3D,lt,ht,K.width,K.height,K.depth),L&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,at,Tt,K.data)):e.texImage3D(i.TEXTURE_3D,0,ht,K.width,K.height,K.depth,0,at,Tt,K.data);else if(_.isFramebufferTexture){if(kt)if(It)e.texStorage2D(i.TEXTURE_2D,lt,ht,K.width,K.height);else{let J=K.width,ct=K.height;for(let pt=0;pt<lt;pt++)e.texImage2D(i.TEXTURE_2D,pt,ht,J,ct,0,at,Tt,null),J>>=1,ct>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){let J=i.canvas;if(J.hasAttribute("layoutsubtree")||J.setAttribute("layoutsubtree","true"),K.parentNode!==J){J.appendChild(K),d.add(_),J.onpaint=ct=>{let pt=ct.changedElements;for(let tt of d)pt.includes(tt.image)&&(tt.needsUpdate=!0)},J.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,K);else{let pt=i.RGBA,tt=i.RGBA,Rt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,pt,tt,Rt,K)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Et.length>0){if(It&&kt){let J=ne(Et[0]);e.texStorage2D(i.TEXTURE_2D,lt,ht,J.width,J.height)}for(let J=0,ct=Et.length;J<ct;J++)ot=Et[J],It?L&&e.texSubImage2D(i.TEXTURE_2D,J,0,0,at,Tt,ot):e.texImage2D(i.TEXTURE_2D,J,ht,at,Tt,ot);_.generateMipmaps=!1}else if(It){if(kt){let J=ne(K);e.texStorage2D(i.TEXTURE_2D,lt,ht,J.width,J.height)}L&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,at,Tt,K)}else e.texImage2D(i.TEXTURE_2D,0,ht,at,Tt,K);p(_)&&b(V),rt.__version=it.version,_.onUpdate&&_.onUpdate(_)}E.__version=_.version}function Ft(E,_,k){if(_.image.length!==6)return;let V=Kt(E,_),X=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+k);let it=n.get(X);if(X.version!==it.__version||V===!0){e.activeTexture(i.TEXTURE0+k);let rt=Ht.getPrimaries(Ht.workingColorSpace),Y=_.colorSpace===Qn?null:Ht.getPrimaries(_.colorSpace),K=_.colorSpace===Qn||rt===Y?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,K);let at=_.isCompressedTexture||_.image[0].isCompressedTexture,Tt=_.image[0]&&_.image[0].isDataTexture,ht=[];for(let tt=0;tt<6;tt++)!at&&!Tt?ht[tt]=m(_.image[tt],!0,s.maxCubemapSize):ht[tt]=Tt?_.image[tt].image:_.image[tt],ht[tt]=Ze(_,ht[tt]);let ot=ht[0],Et=r.convert(_.format,_.colorSpace),It=r.convert(_.type),kt=M(_.internalFormat,Et,It,_.normalized,_.colorSpace),L=_.isVideoTexture!==!0,lt=it.__version===void 0||V===!0,J=X.dataReady,ct=S(_,ot);Zt(i.TEXTURE_CUBE_MAP,_);let pt;if(at){L&&lt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,ct,kt,ot.width,ot.height);for(let tt=0;tt<6;tt++){pt=ht[tt].mipmaps;for(let Rt=0;Rt<pt.length;Rt++){let St=pt[Rt];_.format!==yn?Et!==null?L?J&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt,0,0,St.width,St.height,Et,St.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt,kt,St.width,St.height,0,St.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):L?J&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt,0,0,St.width,St.height,Et,It,St.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt,kt,St.width,St.height,0,Et,It,St.data)}}}else{if(pt=_.mipmaps,L&&lt){pt.length>0&&ct++;let tt=ne(ht[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,ct,kt,tt.width,tt.height)}for(let tt=0;tt<6;tt++)if(Tt){L?J&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,0,0,ht[tt].width,ht[tt].height,Et,It,ht[tt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,kt,ht[tt].width,ht[tt].height,0,Et,It,ht[tt].data);for(let Rt=0;Rt<pt.length;Rt++){let ce=pt[Rt].image[tt].image;L?J&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt+1,0,0,ce.width,ce.height,Et,It,ce.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt+1,kt,ce.width,ce.height,0,Et,It,ce.data)}}else{L?J&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,0,0,Et,It,ht[tt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,kt,Et,It,ht[tt]);for(let Rt=0;Rt<pt.length;Rt++){let St=pt[Rt];L?J&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt+1,0,0,Et,It,St.image[tt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,Rt+1,kt,Et,It,St.image[tt])}}}p(_)&&b(i.TEXTURE_CUBE_MAP),it.__version=X.version,_.onUpdate&&_.onUpdate(_)}E.__version=_.version}function gt(E,_,k,V,X,it){let rt=r.convert(k.format,k.colorSpace),Y=r.convert(k.type),K=M(k.internalFormat,rt,Y,k.normalized,k.colorSpace),at=n.get(_),Tt=n.get(k);if(Tt.__renderTarget=_,!at.__hasExternalTextures){let ht=Math.max(1,_.width>>it),ot=Math.max(1,_.height>>it);X===i.TEXTURE_3D||X===i.TEXTURE_2D_ARRAY?e.texImage3D(X,it,K,ht,ot,_.depth,0,rt,Y,null):e.texImage2D(X,it,K,ht,ot,0,rt,Y,null)}e.bindFramebuffer(i.FRAMEBUFFER,E),we(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,V,X,Tt.__webglTexture,0,xe(_)):(X===i.TEXTURE_2D||X>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&X<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,V,X,Tt.__webglTexture,it),e.bindFramebuffer(i.FRAMEBUFFER,null)}function zt(E,_,k){if(i.bindRenderbuffer(i.RENDERBUFFER,E),_.depthBuffer){let V=_.depthTexture,X=V&&V.isDepthTexture?V.type:null,it=w(_.stencilBuffer,X),rt=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;we(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,xe(_),it,_.width,_.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,xe(_),it,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,it,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,rt,i.RENDERBUFFER,E)}else{let V=_.textures;for(let X=0;X<V.length;X++){let it=V[X],rt=r.convert(it.format,it.colorSpace),Y=r.convert(it.type),K=M(it.internalFormat,rt,Y,it.normalized,it.colorSpace);we(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,xe(_),K,_.width,_.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,xe(_),K,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,K,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ce(E,_,k){let V=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,E),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let X=n.get(_.depthTexture);if(X.__renderTarget=_,(!X.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),V){if(X.__webglInit===void 0&&(X.__webglInit=!0,_.depthTexture.addEventListener("dispose",A)),X.__webglTexture===void 0){X.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,X.__webglTexture),Zt(i.TEXTURE_CUBE_MAP,_.depthTexture);let at=r.convert(_.depthTexture.format),Tt=r.convert(_.depthTexture.type),ht;_.depthTexture.format===Fn?ht=i.DEPTH_COMPONENT24:_.depthTexture.format===wi&&(ht=i.DEPTH24_STENCIL8);for(let ot=0;ot<6;ot++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,ht,_.width,_.height,0,at,Tt,null)}}else nt(_.depthTexture,0);let it=X.__webglTexture,rt=xe(_),Y=V?i.TEXTURE_CUBE_MAP_POSITIVE_X+k:i.TEXTURE_2D,K=_.depthTexture.format===wi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===Fn)we(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,Y,it,0,rt):i.framebufferTexture2D(i.FRAMEBUFFER,K,Y,it,0);else if(_.depthTexture.format===wi)we(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,Y,it,0,rt):i.framebufferTexture2D(i.FRAMEBUFFER,K,Y,it,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Vt(E){let _=n.get(E),k=E.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==E.depthTexture){let V=E.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),V){let X=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,V.removeEventListener("dispose",X)};V.addEventListener("dispose",X),_.__depthDisposeCallback=X}_.__boundDepthTexture=V}if(E.depthTexture&&!_.__autoAllocateDepthBuffer)if(k)for(let V=0;V<6;V++)Ce(_.__webglFramebuffer[V],E,V);else{let V=E.texture.mipmaps;V&&V.length>0?Ce(_.__webglFramebuffer[0],E,0):Ce(_.__webglFramebuffer,E,0)}else if(k){_.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[V]),_.__webglDepthbuffer[V]===void 0)_.__webglDepthbuffer[V]=i.createRenderbuffer(),zt(_.__webglDepthbuffer[V],E,!1);else{let X=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,it=_.__webglDepthbuffer[V];i.bindRenderbuffer(i.RENDERBUFFER,it),i.framebufferRenderbuffer(i.FRAMEBUFFER,X,i.RENDERBUFFER,it)}}else{let V=E.texture.mipmaps;if(V&&V.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),zt(_.__webglDepthbuffer,E,!1);else{let X=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,it=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,it),i.framebufferRenderbuffer(i.FRAMEBUFFER,X,i.RENDERBUFFER,it)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Yt(E,_,k){let V=n.get(E);_!==void 0&&gt(V.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Vt(E)}function le(E){let _=E.texture,k=n.get(E),V=n.get(_);E.addEventListener("dispose",y);let X=E.textures,it=E.isWebGLCubeRenderTarget===!0,rt=X.length>1;if(rt||(V.__webglTexture===void 0&&(V.__webglTexture=i.createTexture()),V.__version=_.version,a.memory.textures++),it){k.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(_.mipmaps&&_.mipmaps.length>0){k.__webglFramebuffer[Y]=[];for(let K=0;K<_.mipmaps.length;K++)k.__webglFramebuffer[Y][K]=i.createFramebuffer()}else k.__webglFramebuffer[Y]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){k.__webglFramebuffer=[];for(let Y=0;Y<_.mipmaps.length;Y++)k.__webglFramebuffer[Y]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(rt)for(let Y=0,K=X.length;Y<K;Y++){let at=n.get(X[Y]);at.__webglTexture===void 0&&(at.__webglTexture=i.createTexture(),a.memory.textures++)}if(E.samples>0&&we(E)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let Y=0;Y<X.length;Y++){let K=X[Y];k.__webglColorRenderbuffer[Y]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[Y]);let at=r.convert(K.format,K.colorSpace),Tt=r.convert(K.type),ht=M(K.internalFormat,at,Tt,K.normalized,K.colorSpace,E.isXRRenderTarget===!0),ot=xe(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,ot,ht,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.RENDERBUFFER,k.__webglColorRenderbuffer[Y])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),zt(k.__webglDepthRenderbuffer,E,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(it){e.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture),Zt(i.TEXTURE_CUBE_MAP,_);for(let Y=0;Y<6;Y++)if(_.mipmaps&&_.mipmaps.length>0)for(let K=0;K<_.mipmaps.length;K++)gt(k.__webglFramebuffer[Y][K],E,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,K);else gt(k.__webglFramebuffer[Y],E,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);p(_)&&b(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(rt){for(let Y=0,K=X.length;Y<K;Y++){let at=X[Y],Tt=n.get(at),ht=i.TEXTURE_2D;(E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(ht=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ht,Tt.__webglTexture),Zt(ht,at),gt(k.__webglFramebuffer,E,at,i.COLOR_ATTACHMENT0+Y,ht,0),p(at)&&b(ht)}e.unbindTexture()}else{let Y=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(Y=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(Y,V.__webglTexture),Zt(Y,_),_.mipmaps&&_.mipmaps.length>0)for(let K=0;K<_.mipmaps.length;K++)gt(k.__webglFramebuffer[K],E,_,i.COLOR_ATTACHMENT0,Y,K);else gt(k.__webglFramebuffer,E,_,i.COLOR_ATTACHMENT0,Y,0);p(_)&&b(Y),e.unbindTexture()}E.depthBuffer&&Vt(E)}function Wt(E){let _=E.textures;for(let k=0,V=_.length;k<V;k++){let X=_[k];if(p(X)){let it=C(E),rt=n.get(X).__webglTexture;e.bindTexture(it,rt),b(it),e.unbindTexture()}}}let pe=[],Ue=[];function nn(E){if(E.samples>0){if(we(E)===!1){let _=E.textures,k=E.width,V=E.height,X=i.COLOR_BUFFER_BIT,it=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=n.get(E),Y=_.length>1;if(Y)for(let at=0;at<_.length;at++)e.bindFramebuffer(i.FRAMEBUFFER,rt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,rt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,rt.__webglMultisampledFramebuffer);let K=E.texture.mipmaps;K&&K.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,rt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,rt.__webglFramebuffer);for(let at=0;at<_.length;at++){if(E.resolveDepthBuffer&&(E.depthBuffer&&(X|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&(X|=i.STENCIL_BUFFER_BIT)),Y){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,rt.__webglColorRenderbuffer[at]);let Tt=n.get(_[at]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Tt,0)}i.blitFramebuffer(0,0,k,V,0,0,k,V,X,i.NEAREST),l===!0&&(pe.length=0,Ue.length=0,pe.push(i.COLOR_ATTACHMENT0+at),E.depthBuffer&&E.storeMultisampledDepthBuffer===!1&&(pe.push(it),Ue.push(it),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ue)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,pe))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Y)for(let at=0;at<_.length;at++){e.bindFramebuffer(i.FRAMEBUFFER,rt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,rt.__webglColorRenderbuffer[at]);let Tt=n.get(_[at]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,rt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.TEXTURE_2D,Tt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,rt.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.storeMultisampledDepthBuffer===!1&&l){let _=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function xe(E){return Math.min(s.maxSamples,E.samples)}function we(E){let _=n.get(E);return E.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function N(E){let _=a.render.frame;h.get(E)!==_&&(h.set(E,_),E.update())}function Ze(E,_){let k=E.colorSpace,V=E.format,X=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||k!==Ir&&k!==Qn&&(Ht.getTransfer(k)===Jt?(V!==yn||X!==on)&&Dt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Lt("WebGLTextures: Unsupported texture color space:",k)),_}function ne(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(c.width=E.naturalWidth||E.width,c.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(c.width=E.displayWidth,c.height=E.displayHeight):(c.width=E.width,c.height=E.height),c}this.allocateTextureUnit=W,this.resetTextureUnits=B,this.getTextureUnits=P,this.setTextureUnits=O,this.setTexture2D=nt,this.setTexture2DArray=q,this.setTexture3D=Q,this.setTextureCube=et,this.rebindTextures=Yt,this.setupRenderTarget=le,this.updateRenderTargetMipmap=Wt,this.updateMultisampleRenderTarget=nn,this.setupDepthRenderbuffer=Vt,this.setupFrameBufferTexture=gt,this.useMultisampledRTT=we,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function uv(i,t){function e(n,s=Qn){let r,a=Ht.getTransfer(s);if(n===on)return i.UNSIGNED_BYTE;if(n===jo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Qo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Lh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Dh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Ph)return i.BYTE;if(n===Ih)return i.SHORT;if(n===Xs)return i.UNSIGNED_SHORT;if(n===Ko)return i.INT;if(n===Rn)return i.UNSIGNED_INT;if(n===Pn)return i.FLOAT;if(n===Le)return i.HALF_FLOAT;if(n===Nh)return i.ALPHA;if(n===Uh)return i.RGB;if(n===yn)return i.RGBA;if(n===Fn)return i.DEPTH_COMPONENT;if(n===wi)return i.DEPTH_STENCIL;if(n===Fh)return i.RED;if(n===tl)return i.RED_INTEGER;if(n===Ti)return i.RG;if(n===el)return i.RG_INTEGER;if(n===nl)return i.RGBA_INTEGER;if(n===la||n===ca||n===ha||n===ua)if(a===Jt)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===la)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ca)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ha)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ua)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===la)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ca)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ha)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ua)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===il||n===sl||n===rl||n===al)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===il)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===sl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===rl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===al)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ol||n===ll||n===cl||n===hl||n===ul||n===da||n===dl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===ol||n===ll)return a===Jt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===cl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===hl)return r.COMPRESSED_R11_EAC;if(n===ul)return r.COMPRESSED_SIGNED_R11_EAC;if(n===da)return r.COMPRESSED_RG11_EAC;if(n===dl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===fl||n===pl||n===ml||n===gl||n===xl||n===_l||n===yl||n===vl||n===Ml||n===bl||n===Sl||n===wl||n===Tl||n===El)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===fl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===pl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ml)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===gl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===xl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===_l)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===yl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===vl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Ml)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===bl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Sl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===wl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Tl)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===El)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Al||n===Cl||n===Rl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Al)return a===Jt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Cl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Rl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Pl||n===Il||n===fa||n===Ll)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Pl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Il)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===fa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ll)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Zs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var dv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,fv=`
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

}`,nu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new Gr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Se({vertexShader:dv,fragmentShader:fv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Nt(new Ie(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},iu=class extends kn{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,x=null,g=typeof XRWebGLBinding<"u",m=new nu,p={},b=e.getContextAttributes(),C=null,M=null,w=[],S=[],A=new bt,y=null,T=null,R=new ke;R.viewport=new me;let U=new ke;U.viewport=new me;let F=[R,U],B=new $o,P=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let j=w[$];return j===void 0&&(j=new Ns,w[$]=j),j.getTargetRaySpace()},this.getControllerGrip=function($){let j=w[$];return j===void 0&&(j=new Ns,w[$]=j),j.getGripSpace()},this.getHand=function($){let j=w[$];return j===void 0&&(j=new Ns,w[$]=j),j.getHandSpace()};function W($){let j=S.indexOf($.inputSource);if(j===-1)return;let yt=w[j];yt!==void 0&&(yt.update($.inputSource,$.frame,c||a),yt.dispatchEvent({type:$.type,data:$.inputSource}))}function Z(){s.removeEventListener("select",W),s.removeEventListener("selectstart",W),s.removeEventListener("selectend",W),s.removeEventListener("squeeze",W),s.removeEventListener("squeezestart",W),s.removeEventListener("squeezeend",W),s.removeEventListener("end",Z),s.removeEventListener("inputsourceschange",nt);for(let $=0;$<w.length;$++){let j=S[$];j!==null&&(S[$]=null,w[$].disconnect(j))}P=null,O=null,m.reset();for(let $ in p)delete p[$];if(t.setRenderTarget(C),f=null,u=null,d=null,s=null,M=null,Kt.stop(),n.isPresenting=!1,t.setPixelRatio(y),t.setSize(A.width,A.height,!1),T!==null){let $=T.camera;$.fov=T.fov,$.zoom=T.zoom,$.updateProjectionMatrix(),T=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&Dt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){o=$,n.isPresenting===!0&&Dt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function($){c=$},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&g&&(d=new XRWebGLBinding(s,e)),d},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function($){if(s=$,s!==null){if(C=t.getRenderTarget(),s.addEventListener("select",W),s.addEventListener("selectstart",W),s.addEventListener("selectend",W),s.addEventListener("squeeze",W),s.addEventListener("squeezestart",W),s.addEventListener("squeezeend",W),s.addEventListener("end",Z),s.addEventListener("inputsourceschange",nt),b.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(A),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Ft=null,gt=null;b.depth&&(gt=b.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,yt=b.stencil?wi:Fn,Ft=b.stencil?Zs:Rn);let zt={colorFormat:e.RGBA8,depthFormat:gt,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(zt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),M=new ye(u.textureWidth,u.textureHeight,{format:yn,type:on,depthTexture:new xi(u.textureWidth,u.textureHeight,Ft,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:b.stencil,colorSpace:t.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let yt={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,yt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new ye(f.framebufferWidth,f.framebufferHeight,{format:yn,type:on,colorSpace:t.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Kt.setContext(s),Kt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function nt($){for(let j=0;j<$.removed.length;j++){let yt=$.removed[j],Ft=S.indexOf(yt);Ft>=0&&(S[Ft]=null,w[Ft].disconnect(yt))}for(let j=0;j<$.added.length;j++){let yt=$.added[j],Ft=S.indexOf(yt);if(Ft===-1){for(let zt=0;zt<w.length;zt++)if(zt>=S.length){S.push(yt),Ft=zt;break}else if(S[zt]===null){S[zt]=yt,Ft=zt;break}if(Ft===-1)break}let gt=w[Ft];gt&&gt.connect(yt)}}let q=new D,Q=new D;function et($,j,yt){q.setFromMatrixPosition(j.matrixWorld),Q.setFromMatrixPosition(yt.matrixWorld);let Ft=q.distanceTo(Q),gt=j.projectionMatrix.elements,zt=yt.projectionMatrix.elements,Ce=gt[14]/(gt[10]-1),Vt=gt[14]/(gt[10]+1),Yt=(gt[9]+1)/gt[5],le=(gt[9]-1)/gt[5],Wt=(gt[8]-1)/gt[0],pe=(zt[8]+1)/zt[0],Ue=Ce*Wt,nn=Ce*pe,xe=Ft/(-Wt+pe),we=xe*-Wt;if(j.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(we),$.translateZ(xe),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),gt[10]===-1)$.projectionMatrix.copy(j.projectionMatrix),$.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{let N=Ce+xe,Ze=Vt+xe,ne=Ue-we,E=nn+(Ft-we),_=Yt*Vt/Ze*N,k=le*Vt/Ze*N;$.projectionMatrix.makePerspective(ne,E,_,k,N,Ze),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function Pt($,j){j===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(j.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(s===null)return;let j=$.near,yt=$.far;m.texture!==null&&(m.depthNear>0&&(j=m.depthNear),m.depthFar>0&&(yt=m.depthFar)),B.near=U.near=R.near=j,B.far=U.far=R.far=yt,(P!==B.near||O!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),P=B.near,O=B.far),B.layers.mask=$.layers.mask|6,R.layers.mask=B.layers.mask&-5,U.layers.mask=B.layers.mask&-3;let Ft=$.parent,gt=B.cameras;Pt(B,Ft);for(let zt=0;zt<gt.length;zt++)Pt(gt[zt],Ft);gt.length===2?et(B,R,U):B.projectionMatrix.copy(R.projectionMatrix),T===null&&$.isPerspectiveCamera&&(T={camera:$,fov:$.fov,zoom:$.zoom}),Ct($,B,Ft)};function Ct($,j,yt){yt===null?$.matrix.copy(j.matrixWorld):($.matrix.copy(yt.matrixWorld),$.matrix.invert(),$.matrix.multiply(j.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(j.projectionMatrix),$.projectionMatrixInverse.copy(j.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Ur*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function($){l=$,u!==null&&(u.fixedFoveation=$),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=$)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(B)},this.getCameraTexture=function($){return p[$]};let oe=null;function Zt($,j){if(h=j.getViewerPose(c||a),x=j,h!==null){let yt=h.views;f!==null&&(t.setRenderTargetFramebuffer(M,f.framebuffer),t.setRenderTarget(M));let Ft=!1;yt.length!==B.cameras.length&&(B.cameras.length=0,Ft=!0);for(let Vt=0;Vt<yt.length;Vt++){let Yt=yt[Vt],le=null;if(f!==null)le=f.getViewport(Yt);else{let pe=d.getViewSubImage(u,Yt);le=pe.viewport,Vt===0&&(t.setRenderTargetTextures(M,pe.colorTexture,pe.depthStencilTexture),t.setRenderTarget(M))}let Wt=F[Vt];Wt===void 0&&(Wt=new ke,Wt.layers.enable(Vt),Wt.viewport=new me,F[Vt]=Wt),Wt.matrix.fromArray(Yt.transform.matrix),Wt.matrix.decompose(Wt.position,Wt.quaternion,Wt.scale),Wt.projectionMatrix.fromArray(Yt.projectionMatrix),Wt.projectionMatrixInverse.copy(Wt.projectionMatrix).invert(),Wt.viewport.set(le.x,le.y,le.width,le.height),Vt===0&&(B.matrix.copy(Wt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Ft===!0&&B.cameras.push(Wt)}let gt=s.enabledFeatures;if(gt&&gt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&g){d=n.getBinding();let Vt=d.getDepthInformation(yt[0]);Vt&&Vt.isValid&&Vt.texture&&m.init(Vt,s.renderState)}if(gt&&gt.includes("camera-access")&&g){t.state.unbindTexture(),d=n.getBinding();for(let Vt=0;Vt<yt.length;Vt++){let Yt=yt[Vt].camera;if(Yt){let le=p[Yt];le||(le=new Gr,p[Yt]=le);let Wt=d.getCameraImage(Yt);le.sourceTexture=Wt}}}}for(let yt=0;yt<w.length;yt++){let Ft=S[yt],gt=w[yt];Ft!==null&&gt!==void 0&&gt.update(Ft,j,c||a)}oe&&oe($,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),x=null}let Kt=new cp;Kt.setAnimationLoop(Zt),this.setAnimationLoop=function($){oe=$},this.dispose=function(){}}},pv=new ue,mp=new Ut;mp.set(-1,0,0,0,1,0,0,0,1);function mv(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Bh(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,b,C,M){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),d(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&f(m,p,M)):p.isMeshMatcapMaterial?(r(m,p),x(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),g(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,b,C):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===tn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===tn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let b=t.get(p),C=b.envMap,M=b.envMapRotation;C&&(m.envMap.value=C,m.envMapRotation.value.setFromMatrix4(pv.makeRotationFromEuler(M)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(mp),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,b,C){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*b,m.scale.value=C*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,b){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===tn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.retroreflectivity>0&&(m.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=b.texture,m.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function x(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){let b=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(b.matrixWorld),m.nearDistance.value=b.shadow.camera.near,m.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function gv(i,t,e,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,w){let S=w.program;n.uniformBlockBinding(M,S)}function c(M,w){let S=s[M.id];S===void 0&&(m(M),S=h(M),s[M.id]=S,M.addEventListener("dispose",b));let A=w.program;n.updateUBOMapping(M,A);let y=t.render.frame;r[M.id]!==y&&(u(M),r[M.id]=y)}function h(M){let w=d();M.__bindingPointIndex=w;let S=i.createBuffer(),A=M.__size,y=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,A,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,w,S),S}function d(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return Lt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(M){let w=s[M.id],S=M.uniforms,A=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,w);for(let y=0,T=S.length;y<T;y++){let R=S[y];if(Array.isArray(R))for(let U=0,F=R.length;U<F;U++)f(R[U],y,U,A);else f(R,y,0,A)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(M,w,S,A){if(g(M,w,S,A)===!0){let y=M.__offset,T=M.value;if(Array.isArray(T)){let R=0;for(let U=0;U<T.length;U++){let F=T[U],B=p(F);x(F,M.__data,R),typeof F!="number"&&typeof F!="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F)&&(R+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(T,M.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,M.__data)}}function x(M,w,S){typeof M=="number"||typeof M=="boolean"?w[0]=M:M.isMatrix3?(w[0]=M.elements[0],w[1]=M.elements[1],w[2]=M.elements[2],w[3]=0,w[4]=M.elements[3],w[5]=M.elements[4],w[6]=M.elements[5],w[7]=0,w[8]=M.elements[6],w[9]=M.elements[7],w[10]=M.elements[8],w[11]=0):ArrayBuffer.isView(M)?w.set(new M.constructor(M.buffer,M.byteOffset,w.length)):M.toArray(w,S)}function g(M,w,S,A){let y=M.value,T=w+"_"+S;if(A[T]===void 0)return typeof y=="number"||typeof y=="boolean"?A[T]=y:ArrayBuffer.isView(y)?A[T]=y.slice():A[T]=y.clone(),!0;{let R=A[T];if(typeof y=="number"||typeof y=="boolean"){if(R!==y)return A[T]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(R.equals(y)===!1)return R.copy(y),!0}}return!1}function m(M){let w=M.uniforms,S=0,A=16;for(let T=0,R=w.length;T<R;T++){let U=Array.isArray(w[T])?w[T]:[w[T]];for(let F=0,B=U.length;F<B;F++){let P=U[F],O=Array.isArray(P.value)?P.value:[P.value];for(let W=0,Z=O.length;W<Z;W++){let nt=O[W],q=p(nt),Q=S%A,et=Q%q.boundary,Pt=Q+et;S+=et,Pt!==0&&A-Pt<q.storage&&(S+=A-Pt),P.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),P.__offset=S,S+=q.storage}}}let y=S%A;return y>0&&(S+=A-y),M.__size=S,M.__cache={},this}function p(M){let w={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(w.boundary=4,w.storage=4):M.isVector2?(w.boundary=8,w.storage=8):M.isVector3||M.isColor?(w.boundary=16,w.storage=12):M.isVector4?(w.boundary=16,w.storage=16):M.isMatrix3?(w.boundary=48,w.storage=48):M.isMatrix4?(w.boundary=64,w.storage=64):M.isTexture?Dt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(M)?(w.boundary=16,w.storage=M.byteLength):Dt("WebGLRenderer: Unsupported uniform value type.",M),w}function b(M){let w=M.target;w.removeEventListener("dispose",b);let S=a.indexOf(w.__bindingPointIndex);a.splice(S,1),i.deleteBuffer(s[w.id]),delete s[w.id],delete r[w.id]}function C(){for(let M in s)i.deleteBuffer(s[M]);a=[],s={},r={}}return{bind:l,update:c,dispose:C}}var xv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Vn=null;function _v(){return Vn===null&&(Vn=new Do(xv,16,16,Ti,Le),Vn.name="DFG_LUT",Vn.minFilter=Ve,Vn.magFilter=Ve,Vn.wrapS=Un,Vn.wrapT=Un,Vn.generateMipmaps=!1,Vn.needsUpdate=!0),Vn}var Bl=class{constructor(t={}){let{canvas:e=Nf(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=on}=t;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=n.getContextAttributes().alpha}else x=a;let g=f,m=new Set([nl,el,tl]),p=new Set([on,Rn,Xs,Zs,jo,Qo]),b=new Uint32Array(4),C=new Int32Array(4),M=new D,w=null,S=null,A=[],y=[],T=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=fn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,U=!1,F=null,B=null,P=null,O=null;this._outputColorSpace=Ae;let W=0,Z=0,nt=null,q=-1,Q=null,et=new me,Pt=new me,Ct=null,oe=new At(0),Zt=0,Kt=e.width,$=e.height,j=1,yt=null,Ft=null,gt=new me(0,0,Kt,$),zt=new me(0,0,Kt,$),Ce=!1,Vt=new Fs,Yt=!1,le=!1,Wt=new ue,pe=new D,Ue=new me,nn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},xe=!1;function we(){return nt===null?j:1}let N=n;function Ze(v,I){return e.getContext(v,I)}let ne,E,_,k,V,X,it,rt,Y,K,at,Tt,ht,ot,Et,It,kt,L,lt,J,ct,pt,tt;try{let v={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",ce,!1),e.addEventListener("webglcontextrestored",Qt,!1),e.addEventListener("webglcontextcreationerror",Mn,!1),N===null){let I="webgl2";if(N=Ze(I,v),N===null)throw Ze(I)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Rt()}catch(v){throw e.removeEventListener("webglcontextlost",ce,!1),e.removeEventListener("webglcontextrestored",Qt,!1),e.removeEventListener("webglcontextcreationerror",Mn,!1),Lt("WebGLRenderer: "+v.message),v}function Rt(){ne=new T_(N),ne.init(),ct=new uv(N,ne),E=new m_(N,ne,t,ct),_=new cv(N,ne),E.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),B=N.createFramebuffer(),P=N.createFramebuffer(),O=N.createFramebuffer(),k=new C_(N),V=new Yy,X=new hv(N,ne,_,V,E,ct,k),it=new w_(R),rt=new Pg(N),pt=new f_(N,rt),Y=new E_(N,rt,k,pt),K=new P_(N,Y,rt,pt,k),L=new R_(N,E,X),Et=new g_(V),at=new $y(R,it,ne,E,pt,Et),Tt=new mv(R,V),ht=new Ky,ot=new iv(ne),kt=new d_(R,it,_,K,x,l),It=new lv(R,K,E),tt=new gv(N,k,E,_),lt=new p_(N,ne,k),J=new A_(N,ne,k),k.programs=at.programs,R.capabilities=E,R.extensions=ne,R.properties=V,R.renderLists=ht,R.shadowMap=It,R.state=_,R.info=k}g!==on&&(T=new L_(g,e.width,e.height,o,s,r));let St=new iu(R,N);this.xr=St,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let v=ne.get("WEBGL_lose_context");v&&v.loseContext()},this.forceContextRestore=function(){let v=ne.get("WEBGL_lose_context");v&&v.restoreContext()},this.getPixelRatio=function(){return j},this.setPixelRatio=function(v){v!==void 0&&(j=v,this.setSize(Kt,$,!1))},this.getSize=function(v){return v.set(Kt,$)},this.setSize=function(v,I,G=!0){if(St.isPresenting){Dt("WebGLRenderer: Can't change size while VR device is presenting.");return}Kt=v,$=I,e.width=Math.floor(v*j),e.height=Math.floor(I*j),G===!0&&(e.style.width=v+"px",e.style.height=I+"px"),T!==null&&T.setSize(e.width,e.height),this.setViewport(0,0,v,I)},this.getDrawingBufferSize=function(v){return v.set(Kt*j,$*j).floor()},this.setDrawingBufferSize=function(v,I,G){Kt=v,$=I,j=G,e.width=Math.floor(v*G),e.height=Math.floor(I*G),this.setViewport(0,0,v,I)},this.setEffects=function(v){if(g===on){Lt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(v){for(let I=0;I<v.length;I++)if(v[I].isOutputPass===!0){Dt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(v||[])},this.getCurrentViewport=function(v){return v.copy(et)},this.getViewport=function(v){return v.copy(gt)},this.setViewport=function(v,I,G,z){v.isVector4?gt.set(v.x,v.y,v.z,v.w):gt.set(v,I,G,z),_.viewport(et.copy(gt).multiplyScalar(j).round())},this.getScissor=function(v){return v.copy(zt)},this.setScissor=function(v,I,G,z){v.isVector4?zt.set(v.x,v.y,v.z,v.w):zt.set(v,I,G,z),_.scissor(Pt.copy(zt).multiplyScalar(j).round())},this.getScissorTest=function(){return Ce},this.setScissorTest=function(v){_.setScissorTest(Ce=v)},this.setOpaqueSort=function(v){yt=v},this.setTransparentSort=function(v){Ft=v},this.getClearColor=function(v){return v.copy(kt.getClearColor())},this.setClearColor=function(){kt.setClearColor(...arguments)},this.getClearAlpha=function(){return kt.getClearAlpha()},this.setClearAlpha=function(){kt.setClearAlpha(...arguments)},this.clear=function(v=!0,I=!0,G=!0){let z=0;if(v){let H=!1;if(nt!==null){let ft=nt.texture.format;H=m.has(ft)}if(H){let ft=nt.texture.type,xt=p.has(ft),dt=kt.getClearColor(),vt=kt.getClearAlpha(),wt=dt.r,Ot=dt.g,Gt=dt.b;xt?(b[0]=wt,b[1]=Ot,b[2]=Gt,b[3]=vt,N.clearBufferuiv(N.COLOR,0,b)):(C[0]=wt,C[1]=Ot,C[2]=Gt,C[3]=vt,N.clearBufferiv(N.COLOR,0,C))}else z|=N.COLOR_BUFFER_BIT}I&&(z|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),G&&(z|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&N.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(v){v.setRenderer(this),F=v},this.dispose=function(){e.removeEventListener("webglcontextlost",ce,!1),e.removeEventListener("webglcontextrestored",Qt,!1),e.removeEventListener("webglcontextcreationerror",Mn,!1),kt.dispose(),ht.dispose(),ot.dispose(),V.dispose(),it.dispose(),K.dispose(),pt.dispose(),tt.dispose(),at.dispose(),St.dispose(),St.removeEventListener("sessionstart",Tu),St.removeEventListener("sessionend",Eu),Ii.stop()};function ce(v){v.preventDefault(),Nr("WebGLRenderer: Context Lost."),U=!0}function Qt(){Nr("WebGLRenderer: Context Restored."),U=!1;let v=k.autoReset,I=It.enabled,G=It.autoUpdate,z=It.needsUpdate,H=It.type;Rt(),k.autoReset=v,It.enabled=I,It.autoUpdate=G,It.needsUpdate=z,It.type=H}function Mn(v){Lt("WebGLRenderer: A WebGL context could not be created. Reason: ",v.statusMessage)}function In(v){let I=v.target;I.removeEventListener("dispose",In),gm(I)}function gm(v){xm(v),V.remove(v)}function xm(v){let I=V.get(v).programs;I!==void 0&&(I.forEach(function(G){at.releaseProgram(G)}),v.isShaderMaterial&&at.releaseShaderCache(v))}this.renderBufferDirect=function(v,I,G,z,H,ft){I===null&&(I=nn);let xt=H.isMesh&&H.matrixWorld.determinantAffine()<0,dt=vm(v,I,G,z,H);_.setMaterial(z,xt);let vt=G.index,wt=1;if(z.wireframe===!0){if(vt=Y.getWireframeAttribute(G),vt===void 0)return;wt=2}let Ot=G.drawRange,Gt=G.attributes.position,Mt=Ot.start*wt,te=(Ot.start+Ot.count)*wt;ft!==null&&(Mt=Math.max(Mt,ft.start*wt),te=Math.min(te,(ft.start+ft.count)*wt)),vt!==null?(Mt=Math.max(Mt,0),te=Math.min(te,vt.count)):Gt!=null&&(Mt=Math.max(Mt,0),te=Math.min(te,Gt.count));let Te=te-Mt;if(Te<0||Te===1/0)return;pt.setup(H,z,dt,G,vt);let de,re=lt;if(vt!==null&&(de=rt.get(vt),re=J,re.setIndex(de)),H.isMesh)z.wireframe===!0?(_.setLineWidth(z.wireframeLinewidth*we()),re.setMode(N.LINES)):re.setMode(N.TRIANGLES);else if(H.isLine){let qe=z.linewidth;qe===void 0&&(qe=1),_.setLineWidth(qe*we()),H.isLineSegments?re.setMode(N.LINES):H.isLineLoop?re.setMode(N.LINE_LOOP):re.setMode(N.LINE_STRIP)}else H.isPoints?re.setMode(N.POINTS):H.isSprite&&re.setMode(N.TRIANGLES);if(H.isBatchedMesh)if(ne.get("WEBGL_multi_draw"))re.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let qe=H._multiDrawStarts,mt=H._multiDrawCounts,Ke=H._multiDrawCount,$t=vt?rt.get(vt).bytesPerElement:1,mn=V.get(z).currentProgram.getUniforms();for(let Ln=0;Ln<Ke;Ln++)mn.setValue(N,"_gl_DrawID",Ln),re.render(qe[Ln]/$t,mt[Ln])}else if(H.isInstancedMesh)re.renderInstances(Mt,Te,H.count);else if(G.isInstancedBufferGeometry){let qe=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,mt=Math.min(G.instanceCount,qe);re.renderInstances(Mt,Te,mt)}else re.render(Mt,Te)};function wu(v,I,G,z){F!==null&&v.isNodeMaterial&&F.setObject(z,v),Yt===!0&&Et.setState(v,G,!1),v.transparent===!0&&v.side===an&&v.forceSinglePass===!1?(v.side=tn,v.needsUpdate=!0,Ra(v,I,z),v.side=Mi,v.needsUpdate=!0,Ra(v,I,z),v.side=an):Ra(v,I,z)}this.compile=function(v,I,G=null){G===null&&(G=v),F!==null&&F.renderStart(v,I,G),S=ot.get(G),S.init(I),y.push(S),G.traverseVisible(function(H){H.isLight&&H.layers.test(I.layers)&&(S.pushLight(H),H.castShadow&&S.pushShadow(H))}),v!==G&&v.traverseVisible(function(H){H.isLight&&H.layers.test(I.layers)&&(S.pushLight(H),H.castShadow&&S.pushShadow(H))}),S.setupLights(),F!==null&&F.updateLights(S.state.lightsArray),le=this.localClippingEnabled,Yt=Et.init(this.clippingPlanes,le),Yt===!0&&Et.setGlobalState(this.clippingPlanes,I),F!==null&&It.render(S.state.shadowsArray,G,I);let z=new Set;return v.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let ft=H.material;if(ft)if(Array.isArray(ft))for(let xt=0;xt<ft.length;xt++){let dt=ft[xt];wu(dt,G,I,H),z.add(dt)}else wu(ft,G,I,H),z.add(ft)}),S=y.pop(),F!==null&&F.renderEnd(),z},this.compileAsync=function(v,I,G=null){let z=this.compile(v,I,G);return new Promise(H=>{function ft(){if(z.forEach(function(xt){let vt=V.get(xt).currentProgram;(vt===void 0||vt.isReady())&&z.delete(xt)}),z.size===0){H(v);return}setTimeout(ft,10)}ne.get("KHR_parallel_shader_compile")!==null?ft():setTimeout(ft,10)})};let Pc=null;function _m(v){Pc&&Pc(v)}function Tu(){Ii.stop()}function Eu(){Ii.start()}let Ii=new cp;Ii.setAnimationLoop(_m),typeof self<"u"&&Ii.setContext(self),this.setAnimationLoop=function(v){Pc=v,St.setAnimationLoop(v),v===null?Ii.stop():Ii.start()},St.addEventListener("sessionstart",Tu),St.addEventListener("sessionend",Eu),this.render=function(v,I){if(I!==void 0&&I.isCamera!==!0){Lt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(U===!0)return;F!==null&&F.renderStart(v,I);let G=St.enabled===!0&&St.isPresenting===!0,z=T!==null&&(nt===null||G)&&T.begin(R,nt);if(v.matrixWorldAutoUpdate===!0&&v.updateMatrixWorld(),I.parent===null&&I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),St.enabled===!0&&St.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(St.cameraAutoUpdate===!0&&St.updateCamera(I),I=St.getCamera()),v.isScene===!0&&v.onBeforeRender(R,v,I,nt),S=ot.get(v,y.length),S.init(I),S.state.textureUnits=X.getTextureUnits(),y.push(S),Wt.multiplyMatrices(I.projectionMatrix,I.matrixWorldInverse),Vt.setFromProjectionMatrix(Wt,En,I.reversedDepth),le=this.localClippingEnabled,Yt=Et.init(this.clippingPlanes,le),w=ht.get(v,A.length),w.init(),A.push(w),St.enabled===!0&&St.isPresenting===!0){let xt=R.xr.getDepthSensingMesh();xt!==null&&Ic(xt,I,-1/0,R.sortObjects)}Ic(v,I,0,R.sortObjects),w.finish(),F!==null&&F.updateLights(S.state.lightsArray),R.sortObjects===!0&&w.sort(yt,Ft),xe=St.enabled===!1||St.isPresenting===!1||St.hasDepthSensing()===!1,xe&&kt.addToRenderList(w,v),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Yt===!0&&Et.beginShadows();let H=S.state.shadowsArray;if(It.render(H,v,I),Yt===!0&&Et.endShadows(),(z&&T.hasRenderPass())===!1){let xt=w.opaque,dt=w.transmissive;if(S.setupLights(),I.isArrayCamera){let vt=I.cameras;if(dt.length>0)for(let wt=0,Ot=vt.length;wt<Ot;wt++){let Gt=vt[wt];Cu(xt,dt,v,Gt)}xe&&kt.render(v);for(let wt=0,Ot=vt.length;wt<Ot;wt++){let Gt=vt[wt];Au(w,v,Gt,Gt.viewport)}}else dt.length>0&&Cu(xt,dt,v,I),xe&&kt.render(v),Au(w,v,I)}nt!==null&&Z===0&&(X.updateMultisampleRenderTarget(nt),X.updateRenderTargetMipmap(nt)),z&&T.end(R),v.isScene===!0&&v.onAfterRender(R,v,I),pt.resetDefaultState(),q=-1,Q=null,y.pop(),y.length>0?(S=y[y.length-1],X.setTextureUnits(S.state.textureUnits),Yt===!0&&Et.setGlobalState(R.clippingPlanes,S.state.camera)):S=null,A.pop(),A.length>0?w=A[A.length-1]:w=null,F!==null&&F.renderEnd()};function Ic(v,I,G,z){if(v.visible===!1)return;if(v.layers.test(I.layers)){if(v.isGroup)G=v.renderOrder;else if(v.isLOD)v.autoUpdate===!0&&v.update(I);else if(v.isLightProbeGrid)S.pushLightProbeGrid(v);else if(v.isLight)S.pushLight(v),v.castShadow&&S.pushShadow(v);else if(v.isSprite){if(!v.frustumCulled||v.intersectsFrustum(Vt)){z&&Ue.setFromMatrixPosition(v.matrixWorld).applyMatrix4(Wt);let xt=K.update(v),dt=v.material;dt.visible&&w.push(v,xt,dt,G,Ue.z,null,I)}}else if((v.isMesh||v.isLine||v.isPoints)&&(!v.frustumCulled||v.intersectsFrustum(Vt))){let xt=K.update(v),dt=v.material;if(z&&(v.boundingSphere!==void 0?(v.boundingSphere===null&&v.computeBoundingSphere(),Ue.copy(v.boundingSphere.center)):(xt.boundingSphere===null&&xt.computeBoundingSphere(),Ue.copy(xt.boundingSphere.center)),Ue.applyMatrix4(v.matrixWorld).applyMatrix4(Wt)),Array.isArray(dt)){let vt=xt.groups;for(let wt=0,Ot=vt.length;wt<Ot;wt++){let Gt=vt[wt],Mt=dt[Gt.materialIndex];Mt&&Mt.visible&&w.push(v,xt,Mt,G,Ue.z,Gt,I)}}else dt.visible&&w.push(v,xt,dt,G,Ue.z,null,I)}}let ft=v.children;for(let xt=0,dt=ft.length;xt<dt;xt++)Ic(ft[xt],I,G,z)}function Au(v,I,G,z){let{opaque:H,transmissive:ft,transparent:xt}=v;S.setupLightsView(G),Yt===!0&&Et.setGlobalState(R.clippingPlanes,G),z&&_.viewport(et.copy(z)),H.length>0&&Ca(H,I,G),ft.length>0&&Ca(ft,I,G),xt.length>0&&Ca(xt,I,G),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function Cu(v,I,G,z){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[z.id]===void 0){let Mt=ne.has("EXT_color_buffer_half_float")||ne.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[z.id]=new ye(1,1,{generateMipmaps:!0,type:Mt?Le:on,minFilter:Hn,samples:Math.max(4,E.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ht.workingColorSpace})}let ft=S.state.transmissionRenderTarget[z.id],xt=z.viewport||et;ft.setSize(xt.z*R.transmissionResolutionScale,xt.w*R.transmissionResolutionScale);let dt=R.getRenderTarget(),vt=R.getActiveCubeFace(),wt=R.getActiveMipmapLevel();R.setRenderTarget(ft),R.getClearColor(oe),Zt=R.getClearAlpha(),Zt<1&&R.setClearColor(16777215,.5),R.clear(),xe&&kt.render(G);let Ot=R.toneMapping;R.toneMapping=fn;let Gt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),S.setupLightsView(z),Yt===!0&&Et.setGlobalState(R.clippingPlanes,z),Ca(v,G,z),X.updateMultisampleRenderTarget(ft),X.updateRenderTargetMipmap(ft),ne.has("WEBGL_multisampled_render_to_texture")===!1){let Mt=!1;for(let te=0,Te=I.length;te<Te;te++){let de=I[te],{object:re,geometry:qe,material:mt,group:Ke}=de;if(mt.side===an&&re.layers.test(z.layers)){let $t=mt.side;mt.side=tn,mt.needsUpdate=!0,Ru(re,G,z,qe,mt,Ke),mt.side=$t,mt.needsUpdate=!0,Mt=!0}}Mt===!0&&(X.updateMultisampleRenderTarget(ft),X.updateRenderTargetMipmap(ft))}R.setRenderTarget(dt,vt,wt),R.setClearColor(oe,Zt),Gt!==void 0&&(z.viewport=Gt),R.toneMapping=Ot}function Ca(v,I,G){let z=I.isScene===!0?I.overrideMaterial:null;for(let H=0,ft=v.length;H<ft;H++){let xt=v[H],{object:dt,geometry:vt,group:wt}=xt,Ot=xt.material;Ot.allowOverride===!0&&z!==null&&(Ot=z),dt.layers.test(G.layers)&&Ru(dt,I,G,vt,Ot,wt)}}function Ru(v,I,G,z,H,ft){F!==null&&H.isNodeMaterial&&F.setObject(v,H),v.onBeforeRender(R,I,G,z,H,ft),v.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,v.matrixWorld),v.normalMatrix.getNormalMatrix(v.modelViewMatrix),H.onBeforeRender(R,I,G,z,v,ft),H.transparent===!0&&H.side===an&&H.forceSinglePass===!1?(H.side=tn,H.needsUpdate=!0,R.renderBufferDirect(G,I,z,H,v,ft),H.side=Mi,H.needsUpdate=!0,R.renderBufferDirect(G,I,z,H,v,ft),H.side=an):R.renderBufferDirect(G,I,z,H,v,ft),v.onAfterRender(R,I,G,z,H,ft)}function Ra(v,I,G){I.isScene!==!0&&(I=nn);let z=V.get(v),H=S.state.lights,ft=S.state.shadowsArray,xt=H.state.version,dt=at.getParameters(v,H.state,ft,I,G,S.state.lightProbeGridArray),vt=at.getProgramCacheKey(dt),wt=z.programs;z.environment=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?I.environment:null,z.fog=I.fog;let Ot=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap;z.envMap=it.get(v.envMap||z.environment,Ot),z.envMapRotation=z.environment!==null&&v.envMap===null?I.environmentRotation:v.envMapRotation,wt===void 0&&(v.addEventListener("dispose",In),wt=new Map,z.programs=wt);let Gt=wt.get(vt);if(Gt!==void 0){if(z.currentProgram===Gt&&z.lightsStateVersion===xt)return Iu(v,dt),Gt}else dt.uniforms=at.getUniforms(v),F!==null&&v.isNodeMaterial&&F.build(v,G,dt),v.onBeforeCompile(dt,R),Gt=at.acquireProgram(dt,vt),wt.set(vt,Gt),z.uniforms=dt.uniforms;let Mt=z.uniforms;return(!v.isShaderMaterial&&!v.isRawShaderMaterial||v.clipping===!0)&&(Mt.clippingPlanes=Et.uniform),Iu(v,dt),z.needsLights=bm(v),z.lightsStateVersion=xt,z.needsLights&&(Mt.ambientLightColor.value=H.state.ambient,Mt.lightProbe.value=H.state.probe,Mt.sunLights.value=H.state.sun,Mt.sunLightShadows.value=H.state.sunShadow,Mt.directionalLights.value=H.state.directional,Mt.directionalLightShadows.value=H.state.directionalShadow,Mt.spotLights.value=H.state.spot,Mt.spotLightShadows.value=H.state.spotShadow,Mt.rectAreaLights.value=H.state.rectArea,Mt.ltc_1.value=H.state.rectAreaLTC1,Mt.ltc_2.value=H.state.rectAreaLTC2,Mt.pointLights.value=H.state.point,Mt.pointLightShadows.value=H.state.pointShadow,Mt.hemisphereLights.value=H.state.hemi,Mt.sunShadowMatrix.value=H.state.sunShadowMatrix,Mt.sunShadowCascade.value=H.state.sunShadowCascade,Mt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Mt.spotLightMatrix.value=H.state.spotLightMatrix,Mt.spotLightMap.value=H.state.spotLightMap,Mt.pointShadowMatrix.value=H.state.pointShadowMatrix),z.lightProbeGrid=S.state.lightProbeGridArray.length>0,z.currentProgram=Gt,z.uniformsList=null,Gt}function Pu(v){if(v.uniformsList===null){let I=v.currentProgram.getUniforms();v.uniformsList=Ys.seqWithValue(I.seq,v.uniforms)}return v.uniformsList}function Iu(v,I){let G=V.get(v);G.outputColorSpace=I.outputColorSpace,G.batching=I.batching,G.batchingColor=I.batchingColor,G.instancing=I.instancing,G.instancingColor=I.instancingColor,G.instancingMorph=I.instancingMorph,G.skinning=I.skinning,G.morphTargets=I.morphTargets,G.morphNormals=I.morphNormals,G.morphColors=I.morphColors,G.morphTargetsCount=I.morphTargetsCount,G.numClippingPlanes=I.numClippingPlanes,G.numIntersection=I.numClipIntersection,G.vertexAlphas=I.vertexAlphas,G.vertexTangents=I.vertexTangents,G.toneMapping=I.toneMapping}function ym(v,I){if(v.length===0)return null;if(v.length===1)return v[0].texture!==null?v[0]:null;M.setFromMatrixPosition(I.matrixWorld);for(let G=0,z=v.length;G<z;G++){let H=v[G];if(H.texture!==null&&H.boundingBox.containsPoint(M))return H}return null}function vm(v,I,G,z,H){I.isScene!==!0&&(I=nn),X.resetTextureUnits();let ft=I.fog,xt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?I.environment:null,dt=nt===null?R.outputColorSpace:nt.isXRRenderTarget===!0?nt.texture.colorSpace:Ht.workingColorSpace,vt=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,wt=it.get(z.envMap||xt,vt),Ot=z.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Gt=!!G.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),Mt=!!G.morphAttributes.position,te=!!G.morphAttributes.normal,Te=!!G.morphAttributes.color,de=fn;z.toneMapped&&(nt===null||nt.isXRRenderTarget===!0)&&(de=R.toneMapping);let re=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,qe=re!==void 0?re.length:0,mt=V.get(z),Ke=S.state.lights;if(Yt===!0&&(le===!0||v!==Q)){let he=v===Q&&z.id===q;Et.setState(z,v,he)}let $t=!1;z.version===mt.__version?(mt.needsLights&&mt.lightsStateVersion!==Ke.state.version||mt.outputColorSpace!==dt||H.isBatchedMesh&&mt.batching===!1||!H.isBatchedMesh&&mt.batching===!0||H.isBatchedMesh&&mt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&mt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&mt.instancing===!1||!H.isInstancedMesh&&mt.instancing===!0||H.isSkinnedMesh&&mt.skinning===!1||!H.isSkinnedMesh&&mt.skinning===!0||H.isInstancedMesh&&mt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&mt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&mt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&mt.instancingMorph===!1&&H.morphTexture!==null||mt.envMap!==wt||z.fog===!0&&mt.fog!==ft||mt.numClippingPlanes!==void 0&&(mt.numClippingPlanes!==Et.numPlanes||mt.numIntersection!==Et.numIntersection)||mt.vertexAlphas!==Ot||mt.vertexTangents!==Gt||mt.morphTargets!==Mt||mt.morphNormals!==te||mt.morphColors!==Te||mt.toneMapping!==de||mt.morphTargetsCount!==qe||!!mt.lightProbeGrid!=S.state.lightProbeGridArray.length>0)&&($t=!0):($t=!0,mt.__version=z.version);let mn=mt.currentProgram;$t===!0&&(mn=Ra(z,I,H),F&&z.isNodeMaterial&&F.onUpdateProgram(z,mn,mt));let Ln=!1,ni=!1,Qi=!1,ie=mn.getUniforms(),ve=mt.uniforms;if(_.useProgram(mn.program)&&(Ln=!0,ni=!0,Qi=!0),z.id!==q&&(q=z.id,ni=!0),mt.needsLights){let he=ym(S.state.lightProbeGridArray,H);mt.lightProbeGrid!==he&&(mt.lightProbeGrid=he,ni=!0)}if(Ln||Q!==v){_.buffers.depth.getReversed()&&v.reversedDepth!==!0&&(v._reversedDepth=!0,v.updateProjectionMatrix()),ie.setValue(N,"projectionMatrix",v.projectionMatrix),ie.setValue(N,"viewMatrix",v.matrixWorldInverse);let si=ie.map.cameraPosition;si!==void 0&&si.setValue(N,pe.setFromMatrixPosition(v.matrixWorld)),E.logarithmicDepthBuffer&&ie.setValue(N,"logDepthBufFC",2/(Math.log(v.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ie.setValue(N,"isOrthographic",v.isOrthographicCamera===!0),Q!==v&&(Q=v,ni=!0,Qi=!0)}if(mt.needsLights&&(Ke.state.sunShadowMap.length>0&&ie.setValue(N,"sunShadowMap",Ke.state.sunShadowMap,X),Ke.state.directionalShadowMap.length>0&&ie.setValue(N,"directionalShadowMap",Ke.state.directionalShadowMap,X),Ke.state.spotShadowMap.length>0&&ie.setValue(N,"spotShadowMap",Ke.state.spotShadowMap,X),Ke.state.pointShadowMap.length>0&&ie.setValue(N,"pointShadowMap",Ke.state.pointShadowMap,X)),H.isSkinnedMesh){ie.setOptional(N,H,"bindMatrix"),ie.setOptional(N,H,"bindMatrixInverse");let he=H.skeleton;he&&(he.boneTexture===null&&he.computeBoneTexture(),ie.setValue(N,"boneTexture",he.boneTexture,X))}H.isBatchedMesh&&(ie.setOptional(N,H,"batchingTexture"),ie.setValue(N,"batchingTexture",H._matricesTexture,X),ie.setOptional(N,H,"batchingIdTexture"),ie.setValue(N,"batchingIdTexture",H._indirectTexture,X),ie.setOptional(N,H,"batchingColorTexture"),H._colorsTexture!==null&&ie.setValue(N,"batchingColorTexture",H._colorsTexture,X));let ii=G.morphAttributes;if((ii.position!==void 0||ii.normal!==void 0||ii.color!==void 0)&&L.update(H,G,mn),(ni||mt.receiveShadow!==H.receiveShadow)&&(mt.receiveShadow=H.receiveShadow,ie.setValue(N,"receiveShadow",H.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&I.environment!==null&&(ve.envMapIntensity.value=I.environmentIntensity),ve.dfgLUT!==void 0&&(ve.dfgLUT.value=_v()),ni){if(ie.setValue(N,"toneMappingExposure",R.toneMappingExposure),mt.needsLights&&Mm(ve,Qi),ft&&z.fog===!0&&Tt.refreshFogUniforms(ve,ft),Tt.refreshMaterialUniforms(ve,z,j,$,S.state.transmissionRenderTarget[v.id]),mt.needsLights&&mt.lightProbeGrid){let he=mt.lightProbeGrid;ve.probesSH.value=he.texture,ve.probesMin.value.copy(he.boundingBox.min),ve.probesMax.value.copy(he.boundingBox.max),ve.probesResolution.value.copy(he.resolution)}Ys.upload(N,Pu(mt),ve,X)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(Ys.upload(N,Pu(mt),ve,X),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ie.setValue(N,"center",H.center),ie.setValue(N,"modelViewMatrix",H.modelViewMatrix),ie.setValue(N,"normalMatrix",H.normalMatrix),ie.setValue(N,"modelMatrix",H.matrixWorld),z.uniformsGroups!==void 0){let he=z.uniformsGroups;for(let si=0,ts=he.length;si<ts;si++){let Du=he[si];tt.update(Du,mn),tt.bind(Du,mn)}}return mn}function Mm(v,I){v.ambientLightColor.needsUpdate=I,v.lightProbe.needsUpdate=I,v.sunLights.needsUpdate=I,v.sunLightShadows.needsUpdate=I,v.directionalLights.needsUpdate=I,v.directionalLightShadows.needsUpdate=I,v.pointLights.needsUpdate=I,v.pointLightShadows.needsUpdate=I,v.spotLights.needsUpdate=I,v.spotLightShadows.needsUpdate=I,v.rectAreaLights.needsUpdate=I,v.hemisphereLights.needsUpdate=I}function bm(v){return v.isMeshLambertMaterial||v.isMeshToonMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isShadowMaterial||v.isShaderMaterial&&v.lights===!0}this.getActiveCubeFace=function(){return W},this.getActiveMipmapLevel=function(){return Z},this.getRenderTarget=function(){return nt},this.setRenderTargetTextures=function(v,I,G){let z=V.get(v);z.__autoAllocateDepthBuffer=v.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),V.get(v.texture).__webglTexture=I,V.get(v.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:G,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(v,I){let G=V.get(v);G.__webglFramebuffer=I,G.__useDefaultFramebuffer=I===void 0},this.setRenderTarget=function(v,I=0,G=0){nt=v,W=I,Z=G;let z=null,H=!1,ft=!1;if(v){let dt=V.get(v);if(dt.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(N.FRAMEBUFFER,dt.__webglFramebuffer),et.copy(v.viewport),Pt.copy(v.scissor),Ct=v.scissorTest,_.viewport(et),_.scissor(Pt),_.setScissorTest(Ct),q=-1;return}else if(dt.__webglFramebuffer===void 0)X.setupRenderTarget(v);else if(dt.__hasExternalTextures)X.rebindTextures(v,V.get(v.texture).__webglTexture,V.get(v.depthTexture).__webglTexture);else if(v.depthBuffer){let Ot=v.depthTexture;if(dt.__boundDepthTexture!==Ot){if(Ot!==null&&V.has(Ot)&&(v.width!==Ot.image.width||v.height!==Ot.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");X.setupDepthRenderbuffer(v)}}let vt=v.texture;(vt.isData3DTexture||vt.isDataArrayTexture||vt.isCompressedArrayTexture)&&(ft=!0);let wt=V.get(v).__webglFramebuffer;v.isWebGLCubeRenderTarget?(Array.isArray(wt[I])?z=wt[I][G]:z=wt[I],H=!0):v.samples>0&&X.useMultisampledRTT(v)===!1?z=V.get(v).__webglMultisampledFramebuffer:Array.isArray(wt)?z=wt[G]:z=wt,et.copy(v.viewport),Pt.copy(v.scissor),Ct=v.scissorTest}else et.copy(gt).multiplyScalar(j).floor(),Pt.copy(zt).multiplyScalar(j).floor(),Ct=Ce;if(G!==0&&(z=B),_.bindFramebuffer(N.FRAMEBUFFER,z)&&_.drawBuffers(v,z),_.viewport(et),_.scissor(Pt),_.setScissorTest(Ct),H){let dt=V.get(v.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+I,dt.__webglTexture,G)}else if(ft){let dt=I;for(let vt=0;vt<v.textures.length;vt++){let wt=V.get(v.textures[vt]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+vt,wt.__webglTexture,G,dt)}}else if(v!==null&&G!==0){let dt=V.get(v.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,dt.__webglTexture,G)}q=-1};function Lu(v){let I=V.get(v);return(I.__readFormat!==v.format||I.__readType!==v.type)&&(I.__readFormat=v.format,I.__readType=v.type,I.__formatReadable=E.textureFormatReadable(v.format),I.__typeReadable=E.textureTypeReadable(v.type)),I}this.readRenderTargetPixels=function(v,I,G,z,H,ft,xt,dt=0){if(!(v&&v.isWebGLRenderTarget)){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let vt=V.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&xt!==void 0&&(vt=vt[xt]),vt){_.bindFramebuffer(N.FRAMEBUFFER,vt);try{let wt=v.textures[dt],Ot=wt.format,Gt=wt.type;v.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+dt);let Mt=Lu(wt);if(Mt.__formatReadable===!1){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Mt.__typeReadable===!1){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}I>=0&&I<=v.width-z&&G>=0&&G<=v.height-H&&N.readPixels(I,G,z,H,ct.convert(Ot),ct.convert(Gt),ft)}finally{let wt=nt!==null?V.get(nt).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,wt)}}},this.readRenderTargetPixelsAsync=async function(v,I,G,z,H,ft,xt,dt=0){if(!(v&&v.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let vt=V.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&xt!==void 0&&(vt=vt[xt]),vt)if(I>=0&&I<=v.width-z&&G>=0&&G<=v.height-H){_.bindFramebuffer(N.FRAMEBUFFER,vt);let wt=v.textures[dt],Ot=wt.format,Gt=wt.type;v.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+dt);let Mt=Lu(wt);if(Mt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Mt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let te=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,te),N.bufferData(N.PIXEL_PACK_BUFFER,ft.byteLength,N.STREAM_READ),N.readPixels(I,G,z,H,ct.convert(Ot),ct.convert(Gt),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let Te=nt!==null?V.get(nt).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,Te);let de=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Ff(N,de,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,te),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,ft),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(te),N.deleteSync(de),ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(v,I=null,G=0){let z=Math.pow(2,-G),H=Math.floor(v.image.width*z),ft=Math.floor(v.image.height*z),xt=I!==null?I.x:0,dt=I!==null?I.y:0;X.setTexture2D(v,0),N.copyTexSubImage2D(N.TEXTURE_2D,G,0,0,xt,dt,H,ft),_.unbindTexture()},this.copyTextureToTexture=function(v,I,G=null,z=null,H=0,ft=0){let xt,dt,vt,wt,Ot,Gt,Mt,te,Te,de=v.isCompressedTexture?v.mipmaps[ft]:v.image;if(G!==null)xt=G.max.x-G.min.x,dt=G.max.y-G.min.y,vt=G.isBox3?G.max.z-G.min.z:1,wt=G.min.x,Ot=G.min.y,Gt=G.isBox3?G.min.z:0;else{let ve=Math.pow(2,-H);xt=Math.floor(de.width*ve),dt=Math.floor(de.height*ve),v.isDataArrayTexture?vt=de.depth:v.isData3DTexture?vt=Math.floor(de.depth*ve):vt=1,wt=0,Ot=0,Gt=0}z!==null?(Mt=z.x,te=z.y,Te=z.z):(Mt=0,te=0,Te=0);let re=ct.convert(I.format),qe=ct.convert(I.type),mt;I.isData3DTexture?(X.setTexture3D(I,0),mt=N.TEXTURE_3D):I.isDataArrayTexture||I.isCompressedArrayTexture?(X.setTexture2DArray(I,0),mt=N.TEXTURE_2D_ARRAY):(X.setTexture2D(I,0),mt=N.TEXTURE_2D),_.activeTexture(N.TEXTURE0),_.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,I.flipY),_.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,I.premultiplyAlpha),_.pixelStorei(N.UNPACK_ALIGNMENT,I.unpackAlignment);let Ke=_.getParameter(N.UNPACK_ROW_LENGTH),$t=_.getParameter(N.UNPACK_IMAGE_HEIGHT),mn=_.getParameter(N.UNPACK_SKIP_PIXELS),Ln=_.getParameter(N.UNPACK_SKIP_ROWS),ni=_.getParameter(N.UNPACK_SKIP_IMAGES);_.pixelStorei(N.UNPACK_ROW_LENGTH,de.width),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,de.height),_.pixelStorei(N.UNPACK_SKIP_PIXELS,wt),_.pixelStorei(N.UNPACK_SKIP_ROWS,Ot),_.pixelStorei(N.UNPACK_SKIP_IMAGES,Gt);let Qi=v.isDataArrayTexture||v.isData3DTexture,ie=I.isDataArrayTexture||I.isData3DTexture;if(v.isDepthTexture){let ve=V.get(v),ii=V.get(I),he=V.get(ve.__renderTarget),si=V.get(ii.__renderTarget);_.bindFramebuffer(N.READ_FRAMEBUFFER,he.__webglFramebuffer),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,si.__webglFramebuffer);for(let ts=0;ts<vt;ts++)Qi&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,V.get(v).__webglTexture,H,Gt+ts),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,V.get(I).__webglTexture,ft,Te+ts)),N.blitFramebuffer(wt,Ot,xt,dt,Mt,te,xt,dt,N.DEPTH_BUFFER_BIT,N.NEAREST);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(H!==0||v.isRenderTargetTexture||V.has(v)){let ve=V.get(v),ii=V.get(I);_.bindFramebuffer(N.READ_FRAMEBUFFER,P),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,O);for(let he=0;he<vt;he++)Qi?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ve.__webglTexture,H,Gt+he):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,ve.__webglTexture,H),ie?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ii.__webglTexture,ft,Te+he):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,ii.__webglTexture,ft),H!==0?N.blitFramebuffer(wt,Ot,xt,dt,Mt,te,xt,dt,N.COLOR_BUFFER_BIT,N.NEAREST):ie?N.copyTexSubImage3D(mt,ft,Mt,te,Te+he,wt,Ot,xt,dt):N.copyTexSubImage2D(mt,ft,Mt,te,wt,Ot,xt,dt);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else ie?v.isDataTexture||v.isData3DTexture?N.texSubImage3D(mt,ft,Mt,te,Te,xt,dt,vt,re,qe,de.data):I.isCompressedArrayTexture?N.compressedTexSubImage3D(mt,ft,Mt,te,Te,xt,dt,vt,re,de.data):N.texSubImage3D(mt,ft,Mt,te,Te,xt,dt,vt,re,qe,de):v.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,ft,Mt,te,xt,dt,re,qe,de.data):v.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,ft,Mt,te,de.width,de.height,re,de.data):N.texSubImage2D(N.TEXTURE_2D,ft,Mt,te,xt,dt,re,qe,de);_.pixelStorei(N.UNPACK_ROW_LENGTH,Ke),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,$t),_.pixelStorei(N.UNPACK_SKIP_PIXELS,mn),_.pixelStorei(N.UNPACK_SKIP_ROWS,Ln),_.pixelStorei(N.UNPACK_SKIP_IMAGES,ni),ft===0&&I.generateMipmaps&&N.generateMipmap(mt),_.unbindTexture()},this.initRenderTarget=function(v){V.get(v).__webglFramebuffer===void 0&&X.setupRenderTarget(v)},this.initTexture=function(v){v.isCubeTexture?X.setTextureCube(v,0):v.isData3DTexture?X.setTexture3D(v,0):v.isDataArrayTexture||v.isCompressedArrayTexture?X.setTexture2DArray(v,0):X.setTexture2D(v,0),_.unbindTexture()},this.resetState=function(){W=0,Z=0,nt=null,_.reset(),pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return En}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Ht._getDrawingBufferColorSpace(t),e.unpackColorSpace=Ht._getUnpackColorSpace()}};var ae="#1b140c",js="#fbf5e6",_t={vermilion:"#d8462a",orange:"#ec8a3c",amber:"#f2b53f",bone:"#f6efdc",cream:"#efe3c4",cyan:"#9fd9e4",sky:"#7cc0d6",teal:"#6e8a8f",slate:"#4f5f63",brass:"#b8924f",blush:"#f2a08c",ink:ae};function ge(i,{shine:t=""}={}){let e=[],n=[],s=[];for(let r of i)if(r.t==="fill")e.push(`<path d="${r.d}" fill="${js}" stroke="${js}" stroke-width="13" stroke-linejoin="round"/>`),n.push(`<path d="${r.d}" fill="${ae}" opacity=".32" transform="translate(2.6 3.6)"/>`),s.push(`<path d="${r.d}" fill="${r.c}" stroke="${ae}" stroke-width="${r.w??4.6}" stroke-linejoin="round"/>`);else if(r.t==="dot")e.push(`<circle cx="${r.x}" cy="${r.y}" r="${r.r+6}" fill="${js}"/>`),n.push(`<circle cx="${r.x+2.6}" cy="${r.y+3.6}" r="${r.r}" fill="${ae}" opacity=".32"/>`),s.push(`<circle cx="${r.x}" cy="${r.y}" r="${r.r}" fill="${r.c}" stroke="${ae}" stroke-width="${r.c===ae?0:4.2}"/>`);else if(r.t==="line"){let a=r.w??7;e.push(`<path d="${r.d}" fill="none" stroke="${js}" stroke-width="${a+13}" stroke-linecap="round" stroke-linejoin="round"/>`),n.push(`<path d="${r.d}" fill="none" stroke="${ae}" opacity=".32" stroke-width="${a+4.6}" stroke-linecap="round" stroke-linejoin="round" transform="translate(2.6 3.6)"/>`),s.push(`<path d="${r.d}" fill="none" stroke="${ae}" stroke-width="${a+4.6}" stroke-linecap="round" stroke-linejoin="round"/>`),r.c!==ae&&s.push(`<path d="${r.d}" fill="none" stroke="${r.c}" stroke-width="${a}" stroke-linecap="round" stroke-linejoin="round"/>`)}else r.t==="text"&&(e.push(`<text x="${r.x}" y="${r.y}" font-family="${r.font}" font-size="${r.size}" text-anchor="middle" fill="${js}" stroke="${js}" stroke-width="10" stroke-linejoin="round">${r.s}</text>`),s.push(`<text x="${r.x}" y="${r.y}" font-family="${r.font}" font-size="${r.size}" text-anchor="middle" fill="${r.c}" stroke="${ae}" stroke-width="${r.c===ae?0:2}" paint-order="stroke">${r.s}</text>`));return`<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${e.join("")}${n.join("")}${s.join("")}${t}</svg>`}var jt=(i,t,e)=>({t:"fill",d:i,c:t,w:e}),ln=(i,t,e,n)=>({t:"dot",x:i,y:t,r:e,c:n}),qt=(i,t,e)=>({t:"line",d:i,c:t,w:e}),gp=(i,t,e,n,s,r="Yuji Syuku, serif")=>({t:"text",s:i,x:t,y:e,size:n,c:s,font:r}),Qs=(i,t=4)=>`<path d="${i}" fill="none" stroke="#fff" stroke-width="${t}" stroke-linecap="round" opacity=".85"/>`;function ru(i,t,e,n,s,r=-90){let a=[];for(let o=0;o<s*2;o++){let l=(r+o*180/s)*Math.PI/180,c=o%2?n:e;a.push(`${(i+Math.cos(l)*c).toFixed(1)} ${(t+Math.sin(l)*c).toFixed(1)}`)}return`M${a.join(" L")} Z`}function su(i,t,e){return`M${i} ${t-e} Q${i} ${t} ${i+e} ${t} Q${i} ${t} ${i} ${t+e} Q${i} ${t} ${i-e} ${t} Q${i} ${t} ${i} ${t-e} Z`}function yv(i,t,e,n){return ru(i,t,e,n,5,-90)}var Vl=(i,t,e)=>`M${i} ${t} q${-12*e} 0 ${-12*e} ${-11*e} q0 ${-12*e} ${13*e} ${-12*e} q${3*e} ${-12*e} ${17*e} ${-11*e} q${12*e} ${-6*e} ${21*e} ${4*e} q${13*e} ${-1*e} ${14*e} ${11*e} q${9*e} ${3*e} ${6*e} ${13*e} q${-2*e} ${6*e} ${-10*e} ${6*e} Z`,vv="M12 30 Q12 14 30 14 L74 14 Q90 14 90 30 L90 50 Q90 66 74 66 L48 66 L28 86 L33 66 L30 66 Q12 66 12 50 Z",Gl=Object.freeze({surprise:{label:"Surprise",motion:"shake",svg:ge([jt(ru(50,50,48,30,11),_t.vermilion),jt("M43 18 L57 18 L54.5 58 L45.5 58 Z",_t.bone),ln(50,72,7,_t.bone)])},question:{label:"Question",motion:"tilt",svg:ge([qt("M33 34 C33 17 47 11 56 12 C69 14 73 26 69 35 C65 44 53 46 51 56 L51 61",_t.bone,11),ln(51,80,7.5,_t.bone)])},shock:{label:"What?!",motion:"shake",svg:ge([jt("M24 16 L37 16 L34.5 58 L26.5 58 Z",_t.vermilion),ln(30.5,74,6.5,_t.vermilion),qt("M52 34 C52 20 63 15 70 16 C81 18 84 27 81 35 C78 42 69 44 67 52 L67 57",_t.vermilion,10),ln(67,74,6.5,_t.vermilion)])},sweat:{label:"Sweat",motion:"drip",svg:ge([jt("M60 6 C60 6 30 44 30 62 A23 23 0 0 0 76 64 C76 45 60 6 60 6 Z",_t.cyan)],{shine:Qs("M43 58 Q41 67 48 74",5)})},anger:{label:"Anger",motion:"pulse",svg:ge([qt("M18 42 Q38 40 41 18",_t.vermilion,10),qt("M59 18 Q62 40 82 42",_t.vermilion,10),qt("M82 58 Q62 60 59 82",_t.vermilion,10),qt("M41 82 Q38 60 18 58",_t.vermilion,10)])},sparkle:{label:"Sparkle",motion:"twinkle",svg:ge([jt(su(48,50,36),_t.amber),jt(su(82,18,13),_t.bone),jt(su(20,82,11),_t.bone)])},heart:{label:"Fond",motion:"float",svg:ge([jt("M50 86 C20 63 10 45 21 30 C32 15 47 21 50 34 C53 21 68 15 79 30 C90 45 80 63 50 86 Z",_t.vermilion)],{shine:Qs("M28 36 Q30 28 37 27",5)})},music:{label:"Humming",motion:"float",svg:ge([jt("M38 22 L80 12 L80 24 L38 34 Z",ae),qt("M40 28 L40 70",ae,5),qt("M78 18 L78 60",ae,5),jt("M20 74 C20 66 30 62 38 64 C46 66 47 74 40 79 C33 84 20 82 20 74 Z",ae),jt("M58 66 C58 58 68 54 76 56 C84 58 85 66 78 71 C71 76 58 74 58 66 Z",ae)])},sleep:{label:"Asleep",motion:"float",svg:ge([qt("M54 14 L84 14 L54 44 L84 44",_t.bone,7),qt("M32 50 L52 50 L32 70 L52 70",_t.bone,6),qt("M16 76 L30 76 L16 90 L30 90",_t.bone,5)])},gloom:{label:"Gloom",motion:"fall",svg:ge([qt("M24 40 L24 86",_t.teal,5),qt("M38 44 L38 92",_t.teal,5),qt("M52 40 L52 80",_t.teal,5),qt("M66 44 L66 90",_t.teal,5),qt("M80 40 L80 82",_t.teal,5),jt(Vl(30,34,1.5),_t.slate)])},idea:{label:"Idea",motion:"flicker",svg:ge([qt("M50 2 L50 10",_t.amber,5),qt("M18 14 L24 20",_t.amber,5),qt("M82 14 L76 20",_t.amber,5),qt("M8 44 L16 44",_t.amber,5),qt("M92 44 L84 44",_t.amber,5),jt("M50 16 A25 25 0 0 1 67 58 L63 68 L37 68 L33 58 A25 25 0 0 1 50 16 Z",_t.amber),jt("M37 72 L63 72 L60 86 L40 86 Z",_t.brass)],{shine:Qs("M38 34 Q40 26 48 24",5)})},fume:{label:"Fuming",motion:"rise",svg:ge([jt(Vl(26,92,1.1),_t.bone),jt(Vl(52,62,1.3),_t.bone),jt(Vl(30,34,1.05),_t.bone)])},dizzy:{label:"Dizzy",motion:"spin",svg:ge([qt("M50 50 m0 -5 a5 5 0 1 1 -5 5 a10 10 0 1 1 10 10 a15 15 0 1 1 -15 -15 a20 20 0 1 1 20 20 a25 25 0 1 1 -25 -25 a30 30 0 1 1 30 30",_t.orange,6)])},ellipsis:{label:"\u2026",motion:"bob",svg:ge([jt(vv,_t.bone),ln(32,40,6,ae),ln(51,40,6,ae),ln(70,40,6,ae)])},laugh:{label:"Laughing",motion:"shake",svg:ge([jt(ru(50,44,46,36,14,0),_t.amber),gp("ha!",50,58,38,ae)])},shiver:{label:"Shiver",motion:"shake",svg:ge([qt("M14 22 L24 32 L14 42 L24 52 L14 62 L24 72",_t.cyan,5),qt("M86 22 L76 32 L86 42 L76 52 L86 62 L76 72",_t.cyan,5),qt("M50 8 L58 16 L50 24 L58 32",_t.cyan,4)])},tear:{label:"Tears",motion:"drip",svg:ge([jt("M40 14 C40 14 18 42 18 56 A20 20 0 0 0 58 58 C58 42 40 14 40 14 Z",_t.sky),jt("M74 46 C74 46 62 62 62 70 A12 12 0 0 0 86 71 C86 62 74 46 74 46 Z",_t.sky)],{shine:Qs("M28 52 Q27 60 32 65",4)})},blush:{label:"Blush",motion:"pulse",svg:ge([jt("M8 54 C8 44 34 42 38 52 C42 62 12 66 8 54 Z",_t.blush),jt("M62 52 C66 42 92 44 92 54 C88 66 58 62 62 52 Z",_t.blush),qt("M14 56 L22 46",_t.vermilion,3),qt("M22 58 L30 48",_t.vermilion,3),qt("M70 58 L78 48",_t.vermilion,3),qt("M78 58 L86 48",_t.vermilion,3)])},whisper:{label:"Psst",motion:"bob",svg:ge([jt("M10 20 Q10 8 24 8 L76 8 Q90 8 90 20 L90 46 Q90 58 76 58 L30 58 Q10 58 10 46 Z",_t.cream),gp("psst",50,42,26,ae,"Special Elite, monospace"),ln(30,70,4,_t.cream),ln(22,82,3,_t.cream),ln(16,92,2.4,_t.cream)])},think:{label:"Thinking",motion:"bob",svg:ge([jt("M30 64 C14 64 10 50 18 42 C12 30 24 18 36 22 C42 8 64 8 70 20 C84 18 94 32 86 44 C94 56 82 68 70 64 C62 74 40 74 30 64 Z",_t.bone),ln(24,80,6,_t.bone),ln(14,92,4,_t.bone)])},skull:{label:"Doomed",motion:"tilt",svg:ge([jt("M50 10 C26 10 14 26 16 46 C17 58 26 62 30 64 L30 80 L70 80 L70 64 C74 62 83 58 84 46 C86 26 74 10 50 10 Z",_t.bone),ln(37,44,9,ae),ln(63,44,9,ae),jt("M46 58 L50 50 L54 58 Z",ae),qt("M40 70 L40 80",ae,3),qt("M50 70 L50 80",ae,3),qt("M60 70 L60 80",ae,3)])},star:{label:"Well done",motion:"twinkle",svg:ge([jt(yv(50,52,44,19),_t.amber)],{shine:Qs("M42 30 Q46 22 50 20",4)})},hand:{label:"Hand up",motion:"wave",svg:ge([jt("M30 92 L30 46 Q30 38 37 38 Q44 38 44 46 L44 24 Q44 16 51 16 Q58 16 58 24 L58 30 Q58 22 65 22 Q72 22 72 30 L72 40 Q72 33 79 33 Q86 33 86 40 L86 70 Q86 92 64 94 L44 94 Q32 94 30 92 Z",_t.orange)])},bowl:{label:"Hungry",motion:"bob",svg:ge([qt("M36 8 Q30 16 36 24 Q42 32 36 40",_t.bone,4),qt("M54 4 Q48 14 54 22 Q60 30 54 38",_t.bone,4),jt("M10 48 L90 48 Q88 80 58 86 L42 86 Q12 80 10 48 Z",_t.vermilion),jt("M34 86 L66 86 L62 94 L38 94 Z",_t.brass)],{shine:Qs("M20 56 Q24 70 34 76",4)})}}),i1=Object.freeze(["surprise","question","shock","sweat","anger","sparkle","heart","music","sleep","gloom","idea","fume","dizzy","ellipsis","laugh","shiver","tear","blush","whisper","think","skull","star","hand","bowl"]),s1=Object.freeze(["surprise","laugh","sweat","heart","anger","idea","ellipsis","whisper"]);var a1=Object.freeze(["high","low","flat"]),o1=Object.freeze(["lights","shadows","post","particles","marks","zoneOutlines","chalk","camera","capture","footlights"]);function xp(i){return i==="low"?{post:!1,shadows:!1,msaa:0,pixelRatioCap:1,dust:120,sparks:24,footlights:!1}:{post:!0,shadows:!0,msaa:4,pixelRatioCap:2,dust:420,sparks:48,footlights:!0}}var ei=Object.freeze({pointsPerStroke:400,strokesPerScene:800,quantum:1e3,simplify:.0015,densify:.004}),tr=Object.freeze(["white","yellow","pink","blue","green","orange"]),Wl=Object.freeze({thin:.00104,medium:.00195,thick:.00358}),$i=Object.freeze({floor:1.8,layers:Object.freeze([Object.freeze({scale:1.5,alpha:.06}),Object.freeze({scale:1.26,alpha:.3}),Object.freeze({scale:1,alpha:.96})]),highlight:Object.freeze({scale:.45,alpha:.22,lighten:.4}),bites:Object.freeze({from:.55,to:.8,every:2.4,long:[1.2,3.6],thick:[.3,.7],alpha:[.25,.75]})}),Mv=Object.freeze(["off","zones","anywhere"]),Xl=Object.freeze([.82,.84]),Ai=Object.freeze({width:252,depth:58,wall:22,stick:{radius:8,height:62,spacing:27,first:-98},hit:{radius:13,height:96}}),ou=i=>Math.max(0,Math.min(1,i)),_p=i=>Math.round(ou(i)*ei.quantum);function bv(i){let t=[];for(let[e,n]of i)t.push(_p(e),_p(n));return t}function Sv(i){let t=[];for(let e=0;e+1<i.length;e+=2)t.push([i[e]/ei.quantum,i[e+1]/ei.quantum]);return t}function yp([i,t],[e,n],[s,r]){let a=s-e,o=r-n,l=a*a+o*o;if(l===0)return Math.hypot(i-e,t-n);let c=Math.max(0,Math.min(1,((i-e)*a+(t-n)*o)/l));return Math.hypot(i-(e+c*a),t-(n+c*o))}function wv(i,t=ei.simplify){if(i.length<3)return i.slice();let e=new Uint8Array(i.length);e[0]=e[i.length-1]=1;let n=[[0,i.length-1]];for(;n.length;){let[s,r]=n.pop(),a=-1,o=-1;for(let l=s+1;l<r;l++){let c=yp(i[l],i[s],i[r]);c>a&&(a=c,o=l)}a>t&&(e[o]=1,n.push([s,o],[o,r]))}return i.filter((s,r)=>e[r])}function vp(i,t=ei.densify){let e=[];for(let n=0;n<i.length&&(e.push(i[n]),!(n+1>=i.length));n++){let[s,r]=i[n],[a,o]=i[n+1],l=Math.floor(Math.hypot(a-s,o-r)/t);for(let c=1;c<=l;c++)e.push([s+(a-s)*c/(l+1),r+(o-r)*c/(l+1)])}return e}function Tv(i,t){if(i.length<=t)return i;let e=[];for(let n=0;n<t;n++)e.push(i[Math.round(n*(i.length-1)/(t-1))]);return e}function lu({id:i,scene:t,by:e,at:n,colour:s="white",size:r="medium",points:a}){let o=[];if(i||o.push("a stroke needs an id"),t||o.push("a stroke needs a scene"),e||o.push("a stroke needs the user who drew it"),tr.includes(s)||o.push(`colour "${s}" is not one of ${tr.join(", ")}`),r in Wl||o.push(`size "${r}" is not one of ${Object.keys(Wl).join(", ")}`),(!Array.isArray(a)||a.some(c=>!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])))&&o.push("points must be a list of [x, y] fractions"),o.length)return{ok:!1,stroke:null,problems:o};let l=wv(a.map(([c,h])=>[ou(c),ou(h)]));return l=Tv(l,ei.pointsPerStroke),l.length===1&&(l=[l[0],[l[0][0]+5e-4,l[0][1]]]),l.length<2?{ok:!1,stroke:null,problems:["a stroke needs at least one point"]}:{ok:!0,problems:o,stroke:{id:i,scene:t,by:e,at:n??0,colour:s,size:r,p:bv(l)}}}var er=i=>Sv(i.p);function Mp(i){let t=er(i),e=t.map(s=>s[0]),n=t.map(s=>s[1]);return{x0:Math.min(...e),y0:Math.min(...n),x1:Math.max(...e),y1:Math.max(...n)}}function Zl(i,t=null){let e=t?.mode&&Mv.includes(t.mode)?t.mode:i?.mode??"off",n=t?.locked===!0||t?.locked===void 0&&i?.lock===!0;return{mode:e,locked:n}}var au=Object.freeze([null,"off","zones","anywhere"]),bp=i=>au[(au.indexOf(i??null)+1)%au.length];function cu(i,t,e,n){return i.locked||i.mode==="off"?!1:i.mode==="anywhere"?!0:t.some(s=>s.kind==="chalk"&&ls(s.shape,e,n))}function hu(i,t){return i.mode==="off"||i.locked?!1:i.mode==="anywhere"||t.some(e=>e.kind==="chalk")}function uu(i,t,e){if(t.locked||t.mode==="off")return[];if(t.mode==="anywhere")return[i];let n=[],s=[];for(let r of vp(i))cu(t,e,r[0],r[1])?s.push(r):s.length&&(n.push(s),s=[]);return s.length&&n.push(s),n.filter(r=>r.length>=1)}function du(i){let t=new Map;for(let e of i)for(let n of e.strokes??e)t.set(n.id,n);return[...t.values()].sort((e,n)=>e.at-n.at||(e.id<n.id?-1:e.id>n.id?1:0))}function Sp(i,t,e,n=()=>!0){let s=[],r=[],a=(o,l)=>{for(let c=0;c<t.length;c++){let h=t[c],d=t[c+1]??h;if(yp([o,l],h,d)<=e)return!0}return!1};for(let o of i){if(!n(o))continue;let l=vp(er(o),e/2),c=l.map(([f,x])=>a(f,x));if(!c.some(Boolean))continue;s.push(o.id);let h=[],d=0,u=()=>{if(h.length>=2){let f=lu({id:`${o.id}.${++d}`,scene:o.scene,by:o.by,at:o.at,colour:o.colour,size:o.size,points:h});f.ok&&r.push(f.stroke)}h=[]};l.forEach((f,x)=>c[x]?u():h.push(f)),u()}return{removed:s,added:r}}function wp(i,t=ei.strokesPerScene){if(i.length<=t)return{keep:i,overflow:[]};let e=du([i]);return{keep:e.slice(e.length-t),overflow:e.slice(0,e.length-t)}}var Tp=Object.freeze({white:"#f2ecdc",yellow:"#eed46c",pink:"#eba0b8",blue:"#8fc0e0",green:"#97d09c",orange:"#eea060"}),Yi=i=>Tp[i]??Tp.white;function Ev(i,t){let e=parseInt(i.slice(1),16),n=s=>Math.round(s+(255-s)*t);return`rgb(${n(e>>16&255)},${n(e>>8&255)},${n(e&255)})`}function ir(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function xa(i,t,e,n,s,r,a){if(n.length<2)return;let o=n.map(([f,x])=>[f*t,x*e]),l=Math.max($i.floor,Wl[r]*t),c=Yi(s),{bites:h}=$i,d=([f,x])=>f+a()*(x-f);i.save(),i.lineCap="round",i.lineJoin="round";let u=()=>{i.beginPath(),o.forEach(([f,x],g)=>g?i.lineTo(f,x):i.moveTo(f,x))};i.strokeStyle=c;for(let{scale:f,alpha:x}of $i.layers)i.globalAlpha=x,i.lineWidth=l*f,u(),i.stroke();i.strokeStyle=Ev(c,$i.highlight.lighten),i.globalAlpha=$i.highlight.alpha,i.lineWidth=l*$i.highlight.scale,u(),i.stroke(),i.globalCompositeOperation="destination-out",i.fillStyle="#000";for(let f=0;f+1<o.length;f++){let[x,g]=o[f],[m,p]=o[f+1],b=m-x,C=p-g,M=Math.hypot(b,C);if(M<.01)continue;let w=b/M,S=C/M,A=-S,y=w,T=Math.max(1,Math.round(M/h.every));for(let R=0;R<T;R++){let U=(R+a())/T,F=(a()<.5?-1:1)*d([h.from,h.to])*l,B=x+b*U+A*F,P=g+C*U+y*F,O=d(h.long),W=d(h.thick);i.globalAlpha=d(h.alpha),i.beginPath(),i.moveTo(B-w*O-A*W,P-S*O-y*W),i.lineTo(B+w*O-A*W,P+S*O-y*W),i.lineTo(B+w*O+A*W,P+S*O+y*W),i.lineTo(B-w*O+A*W,P-S*O+y*W),i.closePath(),i.fill()}}i.restore()}function ql(i,t,e,n,s=null){let r=[],a=!1;for(let o of i){let l=t[o.id]??"rest";l==="target"&&(a=!0),r.push(`${o.id}:${l}:${Oc(o,l,e).toFixed(2)}`)}return s&&r.push(`B${Object.entries(s.counts??{}).map(([o,l])=>`${o}=${l}`).join(",")}`),r.join("|")+(a?`|t${Math.floor(n*20)}`:"")}var Ep=Object.freeze([[240,186,92],[112,196,222],[226,118,104],[146,208,126],[196,150,232],[242,150,72],[230,220,140]]);function Ap(i){let t=i.reduce((s,r)=>s+r[0],0)/i.length,e=Math.min(...i.map(s=>s[1])),n=Math.max(...i.map(s=>s[1]));return[t,e+(n-e)*.32]}function Cp(i){return Ap(i.floor??i.shape)}function Av(i,t,e,n,s,r,a,{labels:o=!0}={}){let l=n.filter(h=>h.kind==="area"),c=new Map;l.forEach((h,d)=>{let u=(h.floor??h.shape).map(([b,C])=>[b*t,C*e]),[f,x,g]=h.colour??Ep[d%Ep.length],m=r?.[h.id]==="target",p=()=>{i.beginPath(),u.forEach(([b,C],M)=>M?i.lineTo(b,C):i.moveTo(b,C)),i.closePath()};i.save(),p(),i.fillStyle=`rgba(${f},${x},${g},${m?.3:.17})`,i.fill(),i.lineJoin="round",i.setLineDash([18,9]),i.lineDashOffset=m?-a*60:0,p(),i.strokeStyle="rgba(16,10,5,0.6)",i.lineWidth=7,i.stroke(),p(),i.strokeStyle=`rgba(${f},${x},${g},0.95)`,i.lineWidth=m?4.5:3.2,i.stroke(),i.restore(),c.set(h.id,Ap(u))}),i.save(),i.setLineDash([10,10]),i.lineCap="round";for(let{a:h,b:d}of s.bands??[]){let u=c.get(h),f=c.get(d);!u||!f||(i.beginPath(),i.moveTo(u[0],u[1]+30),i.lineTo(f[0],f[1]+30),i.strokeStyle="rgba(16,10,5,0.45)",i.lineWidth=6,i.stroke(),i.strokeStyle="rgba(255,236,200,0.7)",i.lineWidth=2.6,i.stroke())}i.restore(),o&&l.forEach(h=>{let[d,u]=c.get(h.id);i.save(),i.textAlign="center",i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.lineWidth=7,i.strokeStyle="rgba(16,10,5,0.78)",i.strokeText(h.name||h.id,d,u),i.fillStyle="rgba(255,240,212,1)",i.fillText(h.name||h.id,d,u);let f=s.counts?.[h.id]??0,x=[...(h.tags??[]).map(g=>g.toUpperCase()),f?`${f} HERE`:null].filter(Boolean);if(x.length){i.font="700 15px system-ui, sans-serif";let g=x.map(p=>i.measureText(p).width+18),m=d-(g.reduce((p,b)=>p+b,0)+6*(x.length-1))/2;x.forEach((p,b)=>{let C=p.endsWith(" HERE");Pp(i,m+g[b]/2,u+24,p,15,C?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",C?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.72)"),m+=g[b]+6})}i.restore()})}function Rp(i,t=0){let e=i.name||i.id,n=[...(i.tags??[]).map(f=>f.toUpperCase()),t?`${t} HERE`:null].filter(Boolean),s=nr(8,8).getContext("2d");s.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';let r=s.measureText(e).width;s.font="700 17px system-ui, sans-serif";let a=n.map(f=>s.measureText(f).width+20),o=a.reduce((f,x)=>f+x,0)+7*Math.max(0,n.length-1),l=Math.ceil(Math.max(r+24,o+12)),c=n.length?84:50,h=nr(l*2,c*2),d=h.getContext("2d");d.scale(2,2),d.textAlign="center",d.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif',d.lineJoin="round",d.lineWidth=7,d.strokeStyle="rgba(16,10,5,0.82)",d.strokeText(e,l/2,36),d.fillStyle="rgba(255,240,212,1)",d.fillText(e,l/2,36);let u=l/2-o/2;return n.forEach((f,x)=>{let g=f.endsWith(" HERE");Pp(d,u+a[x]/2,64,f,17,g?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",g?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.75)"),u+=a[x]+7}),{canvas:h,w:l,h:c}}function Pp(i,t,e,n,s,r,a){i.save(),i.font=`700 ${s}px system-ui, sans-serif`,i.textAlign="center",i.textBaseline="middle";let o=i.measureText(n).width+16,l=s+10;i.setLineDash([]),i.beginPath(),i.roundRect(t-o/2,e-l/2,o,l,l/2),i.fillStyle=a,i.fill(),i.fillStyle=r,i.fillText(n,t,e+1),i.restore()}function $l(i,t,e,n,s,r,a,o=null,{boardLabels:l=!0}={}){i.clearRect(0,0,t,e),o&&Av(i,t,e,n,o,s,a,{labels:l});for(let c of n){if(o&&c.kind==="area")continue;let h=s[c.id]??"rest",d=Oc(c,h,r);if(d<=.01)continue;let u=c.shape.map(([g,m])=>[g*t,m*e]),f=()=>{i.beginPath(),u.forEach(([g,m],p)=>p?i.lineTo(g,m):i.moveTo(g,m)),i.closePath()},x=h==="target";if(i.lineJoin="round",i.setLineDash([14,11]),i.lineDashOffset=x?-a*60:0,f(),i.strokeStyle=`rgba(20,12,6,${.55*d})`,i.lineWidth=6,i.stroke(),f(),i.strokeStyle=x?`rgba(255,150,70,${d})`:`rgba(255,222,170,${.9*d})`,i.lineWidth=x?4:2.4,i.stroke(),i.setLineDash([]),d>=.8&&c.name){let g=u.reduce((p,b)=>p+b[0],0)/u.length,m=Math.min(...u.map(p=>p[1]))-10;i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.textAlign="center",i.lineWidth=7,i.strokeStyle=`rgba(20,12,6,${.7*d})`,i.strokeText(c.name,g,m),i.fillStyle=`rgba(255,236,200,${d})`,i.fillText(c.name,g,m),c.hint&&(i.font="600 20px sans-serif",i.lineWidth=5,i.strokeStyle=`rgba(20,12,6,${.7*d})`,i.strokeText(c.hint.toUpperCase(),g,m+26),i.fillStyle=`rgba(255,222,170,${.85*d})`,i.fillText(c.hint.toUpperCase(),g,m+26))}}}var nr=(i,t)=>{let e=document.createElement("canvas");return e.width=i,e.height=t,e};function Ip(){let i=nr(64,64),t=i.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.35,"rgba(255,255,255,0.5)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),i}function Yl(){let i=nr(256,256),t=i.getContext("2d");t.translate(128,128),t.lineCap="round";let e=9;for(let[n,s]of[[20,"#1b140c"],[10,"#e6c98d"]]){t.strokeStyle=s,t.lineWidth=n;for(let r=0;r<e;r++){let a=r/e*Math.PI*2+.3,o=120*(.72+.28*(r*7%3/2));t.beginPath(),t.moveTo(Math.cos(a)*46,Math.sin(a)*46),t.lineTo(Math.cos(a)*o,Math.sin(a)*o),t.stroke()}}t.fillStyle="#fff7d6",t.strokeStyle="#1b140c",t.lineWidth=6,t.beginPath();for(let n=0;n<16;n++){let s=n/16*Math.PI*2,r=n%2?18:40;t[n?"lineTo":"moveTo"](Math.cos(s)*r,Math.sin(s)*r)}return t.closePath(),t.fill(),t.stroke(),i}function Jl(){let i=nr(256,160),t=i.getContext("2d");t.lineCap="round";let e=(n,s)=>{t.strokeStyle=s,t.lineWidth=n;for(let[r,a]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let o=128+r*100,l=80+a*56;t.beginPath(),t.moveTo(o-r*34,l),t.lineTo(o,l),t.lineTo(o,l-a*30),t.stroke()}};return e(13,"rgba(20,12,6,0.7)"),e(7,"#e6c98d"),t.setLineDash([2,12]),t.strokeStyle="rgba(255,226,170,0.75)",t.lineWidth=5,t.beginPath(),t.ellipse(128,80,66,36,0,0,Math.PI*2),t.stroke(),i}function Kl(i){let t=nr(512,96),e=t.getContext("2d");return e.font='700 40px "Helvetica Neue", Arial, sans-serif',e.textAlign="center",e.textBaseline="middle",e.lineWidth=9,e.strokeStyle="rgba(20,12,6,0.8)",e.strokeText(i.toUpperCase(),256,48),e.fillStyle="#ffe9c4",e.fillText(i.toUpperCase(),256,48),t}var Ji=class{constructor(){this.byUrl=new Map}loadImage=t=>t?(this.byUrl.has(t)||this.byUrl.set(t,new Promise(e=>{let n=new Image;n.crossOrigin="anonymous",n.onload=()=>e(n),n.onerror=()=>e(null),n.src=t})),this.byUrl.get(t)):Promise.resolve(null)};var Ki=Math.PI/180,jl=class{constructor(){this.items=new Set}add(t){return t&&this.items.add(t),t}mesh(t){this.add(t.geometry);for(let e of[].concat(t.material)){this.add(e);for(let n of Object.values(e))n?.isTexture&&this.add(n)}return t}disposeAll(){for(let t of this.items)t.dispose?.();this.items.clear()}get size(){return this.items.size}};function cn(i,{anisotropy:t=8,srgb:e=!0}={}){let n=new Vr(i);return e&&(n.colorSpace=Ae),n.anisotropy=t,n}var Lp=()=>cn(Ip(),{anisotropy:1}),Dp=()=>cn(Yl());function fu(i,t,e){let{f:n,cx:s,cy:r,floorY:a}=t.cam,o=20,l=3e4;i.position.set(0,a-r,n),i.projectionMatrix.makePerspective(-o*(s-e.ox)/n,o*(e.ox+e.visW-s)/n,o*(r-e.oy)/n,-o*(e.oy+e.visH-r)/n,o,l),i.projectionMatrixInverse.copy(i.projectionMatrix).invert(),i.updateProjectionMatrix=()=>{},i.updateMatrixWorld(!0)}function _a(i,t,e,n){let{f:s,cx:r,cy:a,floorY:o}=i.cam;return new D((t-r)*(s-n)/s,o-a-(e-a)*(s-n)/s,n)}var Ql=i=>i.cam.f/(Fa.H/2),tc=4e3;function ec(i,t,e=0){let[n,s]=i.size,r=n*i.map.s,a=s*i.map.s,o=-tc+e,l=(i.cam.f-o)/i.cam.f,c=new Nt(new Ie(1,1),t);return c.position.copy(_a(i,i.map.ox+r/2,i.map.oy+a/2,o)),c.scale.set(r*l,a*l,1),c}var ya=4e3,Cv=32e5,nc=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r}){this.description=t,this.rig=e,this.T=n,this.softDot=s,this.settings=r,this.group=new Re,this.lights=[],this.lanterns=[],this.foot=[],this.dust=null}async build(t){let{rig:e,description:n,T:s}=this,r=s.add(new Pe(t));r.colorSpace=Ae,r.anisotropy=8,r.generateMipmaps=!0,r.minFilter=Hn,r.needsUpdate=!0,this.paintTex=r;let[a,o]=e.size,l=a*e.map.s,c=o*e.map.s,h=s.mesh(new Nt(new Ie(1,1),new be({map:r,color:14474460})));h.position.copy(_a(e,e.map.ox+l/2,e.map.oy+c/2,-ya)),h.scale.set(l*(e.cam.f+ya)/e.cam.f,c*(e.cam.f+ya)/e.cam.f,1),this.group.add(h),this.backdrop=h,this.#t(r,l,c);for(let u of n.occluders){let f=e.standing([u.x,u.base]);if(!f)continue;let x=[],g=[];for(let[p,b]of u.poly){let C=_a(e,e.map.x(p),e.map.y(b),f.Z);x.push(C.x,C.y,C.z),g.push(p,1-b)}let m=new _e;m.setAttribute("position",new ee(x,3)),m.setAttribute("uv",new ee(g,2)),m.setIndex(u.poly.length===4?[0,2,1,0,3,2]:Rv(u.poly.length)),this.group.add(s.mesh(new Nt(m,new be({map:r,color:14474460,side:an}))))}let d=s.mesh(new Nt(new Ie(24e3,24e3),new Os({opacity:.62,depthWrite:!1})));return d.rotation.x=-Math.PI/2,d.receiveShadow=!0,d.renderOrder=2,this.group.add(d),this.floor=d,this.ambient=new Jr(16765600,n.ambient),this.group.add(this.ambient),n.lights.forEach((u,f)=>this.#e(u,f)),this.#i(),this.#n(),this}#t(t,e,n){let{rig:s,T:r}=this,a=s.map.oy+n,o=s.ref.H-a+600;if(o<=0)return;let l=Math.min(o,n*.6),c=s.cam.f+ya,h=new Ie(1,1),d=h.attributes.uv;for(let f=0;f<d.count;f++)d.setY(f,d.getY(f)===1?0:l/n);let u=r.mesh(new Nt(h,new be({map:t,color:9079434})));u.position.copy(_a(s,s.map.ox+e/2,a+l/2,-ya)),u.scale.set(e*c/s.cam.f,l*c/s.cam.f,1),this.group.add(u)}#e(t,e){let{rig:n,T:s}=this,r=n.standing([t.at[0],t.below]);if(!r)return;let{cx:a,cy:o,f:l,floorY:c}=n.cam,h=l/(l-r.Z),d=a+(n.map.x(t.at[0])-a)/h,u=o+(n.map.y(t.at[1])-o)/h,f=new D(d-a,c-u,r.Z),x=new At(t.colour[0]/255,t.colour[1]/255,t.colour[2]/255),g=new Vs(x,0,0,1.2,.9,2);if(g.position.copy(f),g.target.position.set(f.x,0,f.z),g.userData={base:t.intensity*Cv,flicker:t.flicker,hz:t.flickerHz,seed:e+1},t.shadow&&this.settings.shadows&&(g.castShadow=!0,g.shadow.mapSize.set(1024,1024),g.shadow.bias=-4e-4,g.shadow.radius=5,g.shadow.camera.near=30,g.shadow.camera.far=3e3),this.group.add(g,g.target),this.lights.push(g),this.lanterns.push({pos:f,colour:x}),t.pool){let m=s.mesh(new Nt(new Wr(t.pool*.62,48),new be({map:this.softDot,color:x,transparent:!0,opacity:.38,blending:_n,depthWrite:!1})));m.rotation.x=-Math.PI/2,m.position.set(f.x,1,f.z),m.renderOrder=1,this.group.add(m)}}#i(){let{T:t}=this;for(let e of[-1,1]){let n=new Vs(16761466,0,0,.66,.75,2);n.position.set(e*640,26,360),n.target.position.set(e*140,340,-420),n.userData={base:23e5},n.visible=!1,this.settings.shadows&&(n.castShadow=!0,n.shadow.mapSize.set(1024,1024),n.shadow.bias=-5e-4,n.shadow.radius=4,n.shadow.camera.near=40,n.shadow.camera.far=2800),this.group.add(n,n.target),this.foot.push(n)}this.wall=t.mesh(new Nt(new Ie(7e3,2600),new Os({opacity:.72,depthWrite:!1}))),this.wall.position.set(0,1300,-2300),this.wall.receiveShadow=!0,this.wall.renderOrder=2,this.wall.visible=!1,this.group.add(this.wall)}setFootlights(t){t=!!t&&this.settings.footlights;for(let e of this.foot)e.visible=t,e.intensity=t?e.userData.base:0;this.wall.visible=t,this.ambient.intensity=t?this.description.ambient*.75:this.description.ambient,this.footlightsOn=t}#n(){let t=this.settings.dust;if(!t)return;let e=new Float32Array(t*3),n=7,s=()=>(n=n*16807%2147483647,n/2147483647);for(let o=0;o<t;o++)e[o*3]=(s()-.5)*2600,e[o*3+1]=40+s()*820,e[o*3+2]=-520+s()*760;let r=this.T.add(new _e);r.setAttribute("position",new Oe(e.slice(),3)),r.setAttribute("color",new Oe(new Float32Array(t*3),3));let a=this.T.add(new gi({size:8*Ql(this.rig),map:this.softDot,vertexColors:!0,transparent:!0,opacity:.9,blending:_n,depthWrite:!1,sizeAttenuation:!0}));this.dust=new Hi(r,a),this.dust.frustumCulled=!1,this.dustBase=e,this.group.add(this.dust)}update(t){for(let r of this.lights){let a=r.userData;r.intensity=a.base*(1+a.flicker*pr(t*a.hz,a.seed))}if(!this.dust)return;let e=this.dust.geometry.attributes.position,n=this.dust.geometry.attributes.color,s=this.dustBase;for(let r=0;r<e.count;r++){let a=s[r*3]+Math.sin(t*.21+r)*22,o=s[r*3+1]+t*(4+r%7)%120,l=s[r*3+2];e.array[r*3]=a,e.array[r*3+1]=o,e.array[r*3+2]=l;let c=0,h=0,d=0;for(let u of this.lanterns){let f=(a-u.pos.x)**2+(o-u.pos.y)**2+(l-u.pos.z)**2,x=Math.max(0,1-Math.sqrt(f)/900);c+=u.colour.r*x*x,h+=u.colour.g*x*x,d+=u.colour.b*x*x}n.array[r*3]=Math.min(1,c),n.array[r*3+1]=Math.min(1,h),n.array[r*3+2]=Math.min(1,d)}e.needsUpdate=!0,n.needsUpdate=!0}};function Rv(i){let t=[];for(let e=1;e<i-1;e++)t.push(0,e+1,e);return t}var va=new D;function vn(i,t,e,n,s,r){let a=2*Math.PI*s/4,o=Math.max(r-2*s,0),l=Math.PI/4;va.copy(t),va[n]=0,va.normalize();let c=.5*a/(a+o),h=1-va.angleTo(i)/l;return Math.sign(va[e])===1?h*c:o/(a+o)+c+c*(1-h)}var ic=class i extends We{constructor(t=1,e=1,n=1,s=2,r=.1){let a=s*2+1;if(r=Math.min(t/2,e/2,n/2,r),super(1,1,1,a,a,a),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:n,segments:s,radius:r},a===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let l=new D,c=new D,h=new D(t,e,n).divideScalar(2).subScalar(r),d=this.attributes.position.array,u=this.attributes.normal.array,f=this.attributes.uv.array,x=d.length/6,g=new D,m=.5/a;for(let p=0,b=0;p<d.length;p+=3,b+=2)switch(l.fromArray(d,p),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),d[p+0]=h.x*Math.sign(l.x)+c.x*r,d[p+1]=h.y*Math.sign(l.y)+c.y*r,d[p+2]=h.z*Math.sign(l.z)+c.z*r,u[p+0]=c.x,u[p+1]=c.y,u[p+2]=c.z,Math.floor(p/x)){case 0:g.set(1,0,0),f[b+0]=vn(g,c,"z","y",r,n),f[b+1]=1-vn(g,c,"y","z",r,e);break;case 1:g.set(-1,0,0),f[b+0]=1-vn(g,c,"z","y",r,n),f[b+1]=1-vn(g,c,"y","z",r,e);break;case 2:g.set(0,1,0),f[b+0]=1-vn(g,c,"x","z",r,t),f[b+1]=vn(g,c,"z","x",r,n);break;case 3:g.set(0,-1,0),f[b+0]=1-vn(g,c,"x","z",r,t),f[b+1]=1-vn(g,c,"z","x",r,n);break;case 4:g.set(0,0,1),f[b+0]=1-vn(g,c,"x","y",r,t),f[b+1]=1-vn(g,c,"y","x",r,e);break;case 5:g.set(0,0,-1),f[b+0]=vn(g,c,"x","y",r,t),f[b+1]=1-vn(g,c,"y","x",r,e);break}}static fromJSON(t){return new i(t.width,t.height,t.depth,t.segments,t.radius)}};var sc=class{constructor(t,e,n,s){this.id=t.id,this.person=t,this.skin=e,this.ctx=n,this.s=s,this.w=e.size.w,this.h=e.size.h,this.stickLen=(e.stick?.length??134)*s,this.root=new Re,this.root.userData.cardId=t.id,this.emote=null,this.ghostTexture=null}async build(){let{skin:t,ctx:e,person:n}=this,s=e.tracker,r=t.materials??{},a=s.add(new Xe({color:r.body?.color??15196109,metalness:r.body?.metalness??0,roughness:r.body?.roughness??.9})),o={loadImage:e.images.loadImage},[l,c]=await Promise.all([t.face(n,o),t.back(n,o)]);this.leanG=new Re,this.hinge=new Re,this.yawG=new Re,this.yawG.rotation.order="YXZ",this.root.add(this.leanG),this.leanG.add(this.hinge),this.hinge.add(this.yawG);let h=this.w,d=this.h,u=s.mesh(new Nt(new ic(h-3,d-3,t.thickness,3,6),a));u.position.y=d/2,u.castShadow=!0;let f=s.add(cn(l));this.ghostTexture=f;let x=s.mesh(new Nt(new Ie(h,d),new zs({map:f,roughness:r.face?.roughness??.5,metalness:r.face?.metalness??.1,clearcoat:r.face?.clearcoat??.6,clearcoatRoughness:.22,transparent:!0,alphaTest:.5,envMapIntensity:.7})));x.position.set(0,d/2,t.thickness/2+.2),x.receiveShadow=!0;let g=s.mesh(new Nt(new Ie(h,d),new Xe({map:s.add(cn(c)),roughness:r.back?.roughness??.62,metalness:r.back?.metalness??.35,transparent:!0,alphaTest:.5})));g.position.set(0,d/2,-(t.thickness/2+.2)),g.rotation.y=Math.PI;let m=s.mesh(new Nt(new We(h*.5,12,54),a));if(m.position.set(0,-6,0),m.castShadow=!0,this.card=new Re,this.card.add(u,x,g,m),n.colour){let p=s.mesh(new Nt(new We(h*.5-8,3,8),new Xe({color:new At(n.colour),roughness:.35,metalness:.1})));p.position.set(0,-2.5,24),this.card.add(p)}return this.card.scale.setScalar(this.s),this.yawG.add(this.card),this.#t(a),this.blob=s.mesh(new Nt(new Ie(1,1),new be({map:e.softDot,color:0,transparent:!0,opacity:.55,depthWrite:!1}))),this.blob.rotation.x=-Math.PI/2,this.blob.renderOrder=2,this.root.traverse(p=>{p.userData.cardId=n.id}),this.pickables=[u,x,g,m],this}#t(t){let{skin:e,ctx:n}=this,s=n.tracker,r=this.s,a=this.stickLen,o=18*r,l=new At(this.person.colour??"#e8e0c8"),c=e.stick?.wood??8409389,h=s.add(new zs({color:c,roughness:.3,clearcoat:1,clearcoatRoughness:.12,emissive:new At(c).multiplyScalar(.45),emissiveIntensity:.9})),d=s.add(new Xe({color:e.stick?.collar??12096079,metalness:1,roughness:.34}));this.rod=new Re;let u=s.mesh(new Nt(new zn(8.5*r,6.4*r,a-o,24),h));u.position.y=(a-o)/2;let f=s.mesh(new Nt(new Xr(6.4*r,18,12),h)),x=s.mesh(new Nt(new zn(12.5*r,10*r,o,28),d));x.position.y=a-o/2;let g=s.mesh(new Nt(new ks(12*r,2.2*r,8,28),d));g.rotation.x=Math.PI/2,g.position.y=a-o;let m=s.mesh(new Nt(new ks(21,3.6,10,36),new Xe({color:l,emissive:l,emissiveIntensity:1.6,roughness:.4})));m.rotation.x=Math.PI/2,m.position.y=8;for(let p of[u,f,x,g])p.castShadow=!0;this.rod.add(u,f,x,g,m),this.rod.visible=!1,this.leanG.add(this.rod)}pose(t){let e=t.grip;this.root.position.set(t.x,t.lift,t.z);let n=1-.45*e;this.leanG.rotation.z=-t.lean*n*Ki,this.hinge.position.y=this.stickLen*e,this.hinge.rotation.z=-t.lean*(1-n)*Ki,this.rod.visible=e>.02,this.rod.scale.set(1,Math.max(e,.001),1),this.yawG.rotation.set(t.pitch*Ki,t.yaw*Ki,0),this.card.scale.set(this.s,this.s*t.breathe*t.squash,this.s),this.blob.position.set(t.x,.6,t.z),t.selected?(this.blob.material.color.setHex(16751174),this.blob.material.blending=_n,this.blob.scale.set(this.w*this.s*1.5,120,1),this.blob.material.opacity=.95):(this.blob.material.color.setHex(0),this.blob.material.blending=bi,this.blob.scale.set(this.w*this.s*(.95+.5*e),74+46*e,1),this.blob.material.opacity=.62-.26*e),this.#e(t)}async setEmote(t){if(this.emote&&(this.emote.sprite.parent?.remove(this.emote.sprite),this.emote=null),!t)return;let e=await this.ctx.emoteTexture(t);if(!e)return;let n=new Bn(this.ctx.tracker.add(new Cn({map:e,depthTest:!1,transparent:!0})));n.renderOrder=50,this.emote={id:t,sprite:n},this.ctx.scene.add(n)}#e(t){if(!this.emote)return;let e=t.emote,n=this.emote.sprite;if(!e||e.id!==this.emote.id){n.visible=!1;return}n.visible=e.opacity>.01,n.material.opacity=e.opacity,n.position.set(t.x+74*this.s,t.lift+this.stickLen*t.grip+this.h*this.s*t.breathe+36,t.z+30),n.scale.set(96*e.pop,96*e.pop,1)}dispose(){this.root.parent?.remove(this.root),this.blob.parent?.remove(this.blob),this.emote&&this.emote.sprite.parent?.remove(this.emote.sprite)}};var Np=.2,Up=.42,Fp=.8,Pv=3,rc=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r,cardHeight:a}){this.T=n,this.cardHeight=a;let o=n.add(Dp());this.impacts=[];for(let c=0;c<3;c++){let h=new Bn(n.add(new Cn({map:o,depthTest:!1,transparent:!0,opacity:0})));h.renderOrder=60,h.scale.set(180,180,1),t.add(h),this.impacts.push(h)}this.flash=new Yr(16769704,0,1100,2),t.add(this.flash);let l=r.sparks;if(this.sparkCount=l,l){let c=n.add(new _e);c.setAttribute("position",new Oe(new Float32Array(l*3),3)),this.sparks=new Hi(c,n.add(new gi({size:12*Ql(e),map:s,color:16767370,transparent:!0,opacity:0,blending:_n,depthWrite:!1}))),this.sparks.frustumCulled=!1,this.dir=Array.from({length:l},(h,d)=>{let u=d/l*Math.PI*2+d%5*.37,f=260+d*53%340;return[Math.cos(u)*f,Math.sin(u)*f*.8+120,d*31%100-50]}),t.add(this.sparks)}this.flashTimes=[],this.calm=!1}update(t,e){for(let r of this.impacts)r.material.opacity=0;this.flash.intensity=0,this.sparks&&(this.sparks.material.opacity=0);let n=0,s=this.cardHeight*.5+60;for(let r of t){let a=e-r.t;if(!(a<0||a>Fp)){if(a<Up&&n<this.impacts.length){let o=this.impacts[n++],l=a/Up;o.position.set(r.x,s+10,r.Z+90),o.scale.setScalar(120+150*Math.sqrt(l)),o.material.opacity=1-l*l,o.material.rotation=.2*l}if(a<Np&&!this.calm&&this.#t(r.t)&&(this.flash.position.set(r.x,s,r.Z+300),this.flash.intensity=55e4*(1-a/Np)**2),this.sparks&&!this.calm&&r===t[t.length-1]){let o=this.sparks.geometry.attributes.position;this.dir.forEach((l,c)=>{o.array[c*3]=r.x+l[0]*a,o.array[c*3+1]=Math.max(2,s+l[1]*a-900*a*a),o.array[c*3+2]=r.Z+90+l[2]*a}),o.needsUpdate=!0,this.sparks.material.opacity=Math.max(0,1-a/Fp)}}}}#t(t){return this.flashTimes.includes(t)?!0:(this.flashTimes=this.flashTimes.filter(e=>t-e<1),this.flashTimes.length>=Pv?!1:(this.flashTimes.push(t),!0))}};var ac=class{constructor({scene:t,rig:e,zones:n,tracker:s}){this.zones=n,this.rig=e;let[r,a]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*a/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=s.add(cn(this.canvas,{anisotropy:4}));let o=s.mesh(ec(e,new be({map:this.tex,transparent:!0,depthWrite:!1}),20));o.renderOrder=3,t.add(o),this.mesh=o,this.key="",o.visible=n.length>0}update(t,e,n,s=null){if(!this.zones.length)return;let r=ql(this.zones,t,e,n,s);r!==this.key&&(this.key=r,$l(this.ctx,this.cw,this.ch,this.zones,t,e,n,s,{boardLabels:!1}),this.tex.needsUpdate=!0)}},oc=class{constructor({scene:t,rig:e,zones:n,tracker:s}){this.T=s,this.scene=t,this.rig=e,this.areas=n.filter(r=>r.kind==="area"),this.labels=new Map}update(t){for(let e of this.areas){let n=this.labels.get(e.id);if(!t){n&&(n.sprite.visible=!1);continue}let s=t.counts?.[e.id]??0;(!n||n.n!==s)&&(n=this.#t(e,s,n)),n.sprite.visible=!!n.at}}#t(t,e,n){let{canvas:s,w:r,h:a}=Rp(t,e),o=this.T.add(cn(s,{anisotropy:4}));if(n)n.sprite.material.map?.dispose(),n.sprite.material.map=o,n.sprite.material.needsUpdate=!0;else{let l=new Bn(this.T.add(new Cn({map:o,depthTest:!1,transparent:!0})));l.renderOrder=45,this.scene.add(l),n={sprite:l,at:this.rig.standing(Cp(t))},this.labels.set(t.id,n)}if(n.n=e,n.at){let{f:l}=this.rig.cam,c=l/(l-n.at.Z),h=1.45/Math.sqrt(Math.max(.15,c));n.sprite.scale.set(r*h,a*h,1),n.sprite.position.set(n.at.X,a*h/2+6,n.at.Z)}return n}},lc=class{constructor({scene:t,tracker:e,softDot:n}){this.T=e,this.scene=t,this.pool=[];let s=e.add(Iv());for(let r=0;r<6;r++){let a=e.mesh(new Nt(new Ie(1,1),new be({map:s,transparent:!0,opacity:0,depthWrite:!1})));a.rotation.x=-Math.PI/2,a.renderOrder=4,a.visible=!1,t.add(a),this.pool.push(a)}this.ghost=e.mesh(new Nt(new Ie(1,1),new be({transparent:!0,opacity:0,depthWrite:!1,side:an}))),this.ghost.visible=!1,this.ghost.renderOrder=5,t.add(this.ghost),this.label=null,this.softDot=n,this.labelText=""}update(t,e,n){this.pool.forEach(s=>{s.visible=!1}),this.ghost.visible=!1,this.label&&(this.label.visible=!1),t.slice(0,this.pool.length).forEach((s,r)=>{let a=this.pool[r],o=s.target?1+.06*Math.sin(n*7):1;a.visible=!0,a.position.set(s.X,1.2,s.Z),a.scale.set((s.target?190:150)*o,(s.target?120:96)*o,1),a.material.opacity=Math.min(1,s.alpha)*(s.target?1:.8),s.target&&this.#t(s,e,n)})}#t(t,e,n){let s=e.get(t.for);if(!s)return;let r=this.ghost;r.material.map!==s.ghostTexture&&(r.material.map=s.ghostTexture,r.material.needsUpdate=!0);let a=t.pose;r.visible=!0,r.material.opacity=.32+.06*Math.sin(n*6),r.scale.set(s.w*s.s,s.h*s.s,1),r.position.set(t.X,a.lift+s.h*s.s/2,t.Z+4),r.rotation.set(0,0,0),r.rotateY(a.yaw*Math.PI/180),r.rotateX(a.pitch*Math.PI/180),r.rotateZ(-a.lean*Math.PI/180),t.label&&this.#e(t.label,t.X,a.lift+s.h*s.s+40,t.Z+10)}#e(t,e,n,s){if(!this.label||this.labelText!==t){this.label?.parent?.remove(this.label);let r=this.T.add(new Cn({map:this.T.add(cn(Kl(t))),depthTest:!1,transparent:!0}));this.label=new Bn(r),this.label.renderOrder=55,this.label.scale.set(260,49,1),this.scene.add(this.label),this.labelText=t}this.label.visible=!0,this.label.position.set(e,n,s)}},Iv=()=>cn(Jl(),{anisotropy:4});var sr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var pn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Lv=new Vi(-1,1,1,-1,0,1),pu=class extends _e{constructor(){super(),this.setAttribute("position",new ee([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ee([0,2,0,0,2,0],2))}},Dv=new pu,Ci=class{constructor(t){this._mesh=new Nt(Dv,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Lv)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var rr=class extends pn{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Se?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=ti.clone(t.uniforms),this.material=new Se({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new Ci(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Ma=class extends pn{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},cc=class extends pn{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var hc=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let n=t.getSize(new bt);this._width=n.width,this._height=n.height,e=new ye(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Le}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new rr(sr),this.copyPass.material.blending=xn,this.timer=new Kr}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),n=!1;for(let s=0,r=this.passes.length;s<r;s++){let a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),a.needsSwap){if(n){let o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Ma!==void 0&&(a instanceof Ma?n=!0:a instanceof cc&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new bt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var uc=class extends pn{constructor(t,e,n=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new At}render(t,e,n){let s=t.autoClear;t.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),t.autoClear=s}};var kp={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new At(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var ar=class i extends pn{constructor(t,e=1,n,s){super(),this.strength=e,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new bt(t.x,t.y):new bt(256,256),this.clearColor=new At(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new ye(r,a,{type:Le,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let d=new ye(r,a,{type:Le,depthBuffer:!1});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);let u=new ye(r,a,{type:Le,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),a=Math.round(a/2)}let o=kp;this.highPassUniforms=ti.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Se({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new bt(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ti.clone(sr.uniforms),this.blendMaterial=new Se({uniforms:this.copyUniforms,vertexShader:sr.vertexShader,fragmentShader:sr.fragmentShader,premultipliedAlpha:!0,blending:_n,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new At,this._oldClearAlpha=1,this._basic=new be,this._fsQuad=new Ci(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new bt(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let a=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),o=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=a}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let a=0;a<t;a++)e.push(.39894*Math.exp(-.5*a*a/(n*n))/n);let s=[],r=[];for(let a=1;a<t;a+=2){let o=e[a],l=a+1<t?e[a+1]:0,c=o+l;s.push((a*o+(a+1)*l)/c),r.push(c)}return new Se({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new bt(.5,.5)},direction:{value:new bt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

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

				}`})}_getCompositeMaterial(t){return new Se({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}};ar.BlurDirectionX=new bt(1,0);ar.BlurDirectionY=new bt(0,1);var ba={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};var dc=class extends pn{constructor(){super(),this.isOutputPass=!0,this.uniforms=ti.clone(ba.uniforms),this.material=new Bs({name:ba.name,uniforms:this.uniforms,vertexShader:ba.vertexShader,fragmentShader:ba.fragmentShader}),this._fsQuad=new Ci(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},Ht.getTransfer(this._outputColorSpace)===Jt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Qr?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===ta?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===ea?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===na?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===sa?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ra?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===ia&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Nv={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.022},uVig:{value:.42},uRes:{value:new bt(2560,1440)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; uniform float uVig; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.35, length(d * vec2(1.05, 1.0)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (hash(vUv * uRes) - 0.5) * uAmount;
      gl_FragColor = c;
    }`},fc=class{constructor(t,e,n,{width:s,height:r,samples:a}){this.target=new ye(s,r,{type:Le,samples:a}),this.composer=new hc(t,this.target),this.composer.setPixelRatio(1),this.composer.setSize(s,r),this.composer.addPass(new uc(e,n)),this.bloom=new ar(new bt(s,r),.32,.55,.82),this.composer.addPass(this.bloom),this.grain=new rr(Nv),this.grain.uniforms.uRes.value.set(s,r),this.composer.addPass(this.grain),this.composer.addPass(new dc)}setSize(t,e){this.composer.setSize(t,e),this.bloom.resolution.set(t,e),this.grain.uniforms.uRes.value.set(t,e)}setCalm(t){this.grain.uniforms.uAmount.value=t?0:.022}render(t){this.grain.uniforms.uTime.value=Math.floor(t*24)%97*.37,this.composer.render()}dispose(){this.composer.dispose?.(),this.target.dispose();for(let t of this.composer.passes)t.dispose?.()}};var pc=class{constructor({scene:t,rig:e,tracker:n,order:s}){let[r,a]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*a/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=n.add(cn(this.canvas,{anisotropy:4})),this.mesh=n.mesh(ec(e,new be({map:this.tex,transparent:!0,depthWrite:!1,color:13684944}),10)),this.mesh.renderOrder=s,t.add(this.mesh)}clear(){this.ctx.clearRect(0,0,this.cw,this.ch)}touch(){this.tex.needsUpdate=!0}},mc=class{constructor({scene:t,rig:e,tracker:n}){this.kept=new pc({scene:t,rig:e,tracker:n,order:2.5}),this.live=new pc({scene:t,rig:e,tracker:n,order:2.6}),this.strokes=new Map,this.hidden=!1,this.preview=null}set(t){this.strokes=new Map(t.map(e=>[e.id,e])),this.#t()}add(t){this.strokes.has(t.id)||(this.strokes.set(t.id,t),this.#e(this.kept,t),this.kept.touch())}remove(t){let e=!1;for(let n of t)e=this.strokes.delete(n)||e;e&&this.#t()}setHidden(t){this.hidden=t,this.kept.mesh.visible=!t,this.live.mesh.visible=!t}setPreview(t,e,n){this.preview=t&&t.length?{points:t,colour:e,size:n}:null,this.live.clear(),this.preview&&this.#i(this.live,this.preview.points,e,n,ir("preview")),this.live.touch()}#t(){this.kept.clear();for(let t of this.strokes.values())this.#e(this.kept,t);this.kept.touch()}#e(t,e){this.#i(t,er(e),e.colour,e.size,ir(e.id))}#i({ctx:t,cw:e,ch:n},s,r,a,o){xa(t,e,n,s,r,a,o)}};var gc=class{constructor({scene:t,rig:e,at:n,tracker:s}){this.group=new Re,this.sticks=[];let r=e.standing(n);if(!r){this.group.visible=!1,t.add(this.group),this.hidden=!0;return}this.group.position.set(r.X,0,r.Z),this.group.rotation.y=-10*Ki;let{width:a,depth:o,wall:l,stick:c,hit:h}=Ai,d=s.add(new Xe({color:8016432,roughness:.6})),u=s.add(new Xe({color:3810322,roughness:.8})),f=s.mesh(new Nt(new We(a,8,o),u));f.position.y=4,this.group.add(f);for(let[C,M,w,S]of[[a,8,0,o/2-4],[a,8,0,-o/2+4],[8,o,a/2-4,0],[8,o,-a/2+4,0]]){let A=s.mesh(new Nt(new We(C,l,M),d));A.position.set(w,l/2+4,S),A.castShadow=!0,this.group.add(A)}let x=s.add(new be({visible:!1})),g=s.add(new zn(h.radius,h.radius,h.height,8));tr.forEach((C,M)=>{let w=c.first+M*c.spacing,S=new At(Yi(C)),A=s.add(new Xe({color:S,roughness:.95,emissive:S.clone().multiplyScalar(.18)})),y=s.mesh(new Nt(new zn(c.radius,c.radius,c.height,14),A));y.position.set(w,4+c.height/2-6,(M%2-.5)*6),y.rotation.z=(M%3-1)*.07,y.rotation.x=((M+1)%3-1)*.05,y.castShadow=!0,this.group.add(y);let T=s.mesh(new Nt(g,x));T.position.set(w,4+h.height/2-14,0),T.userData.chalk=C,this.group.add(T),this.sticks.push(T)});let m=s.add(new Xe({color:599e4,roughness:1})),p=s.mesh(new Nt(new We(50,32,30),m));p.position.set(a/2-34,20,4),p.rotation.y=.12,p.castShadow=!0,this.group.add(p);let b=s.mesh(new Nt(s.add(new We(58,60,50)),x));b.position.set(a/2-34,30,4),b.userData.eraser=!0,this.group.add(b),this.sticks.push(b),t.add(this.group)}setVisible(t){this.hidden||(this.group.visible=t)}get pickables(){return this.sticks}},xc=class{constructor({scene:t,tracker:e}){this.mat=e.add(new Xe({color:16777215,roughness:.9,emissive:3355443})),this.chalk=e.mesh(new Nt(new zn(Ai.stick.radius,Ai.stick.radius,Ai.stick.height,14),this.mat)),this.eraser=e.mesh(new Nt(new We(50,32,30),e.add(new Xe({color:599e4,roughness:1})))),this.group=new Re,this.group.add(this.chalk,this.eraser),this.group.visible=!1,this.group.renderOrder=70,this.group.traverse(n=>{n.renderOrder=70,n.material&&(n.material.depthTest=!1)}),t.add(this.group),this.last=null}set(t,e,n,s=1/60){if(!t){this.group.visible=!1,this.last=null;return}this.group.visible=!0;let r=e==="rub";this.chalk.visible=!r,this.eraser.visible=r,r||this.mat.color.set(Yi(e));let a=this.last?(t.x-this.last.x)/Math.max(s,.001):0;this.last=t,this.group.position.set(t.x,t.y,t.z),this.group.rotation.set(0,0,(r?0:-.6)-Math.max(-.5,Math.min(.5,a/4e3))),this.group.position.y+=n?10:36}};var _c=class{constructor({images:t=new Ji,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="three",this.capabilities={lights:!0,shadows:!0,post:!0,particles:!0,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!0},this.views=new Map,this.adding=new Set,this.tier="high",this.needsRebuild=!1,this.zoneSetting="faint",this.calm=!1,this.disposed=!1,this.ready=!1}mount(t,{quality:e="high",pixelRatio:n=1,width:s=1280,height:r=720}={}){this.tier=e,this.settings=xp(e),this.element=t,this.tracker=new jl,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.renderer=new Bl({canvas:this.canvas,antialias:!this.settings.post,powerPreference:"high-performance"}),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=this.settings.shadows,this.renderer.shadowMap.type=Gi,this.renderer.outputColorSpace=Ae,this.renderer.toneMapping=fn,this.scene=new kr,this.camera=new ke,this.softDot=this.tracker.add(Lp()),this.canvas.addEventListener("webglcontextlost",a=>{a.preventDefault(),!this.disposed&&(this.contextLost=!0,this.onContextLost?.())}),this.#t(s,r,n)}#t(t,e,n){this.width=t,this.height=e,this.ratio=Math.min(n||1,this.settings.pixelRatioCap),this.view=gr(t,e),this.renderer.setPixelRatio(this.ratio),this.renderer.setSize(t,e,!1),this.rig&&fu(this.camera,this.rig,this.view),this.post?.setSize(Math.round(t*this.ratio),Math.round(e*this.ratio))}resize(t,e,n=1){this.disposed||this.#t(t,e,n)}setQuality(t){t!==this.tier&&(this.tier=t,this.needsRebuild=!0)}setCalm(t){this.calm=!!t,this.fx&&(this.fx.calm=this.calm),this.post?.setCalm(this.calm)}setZoneSetting(t){this.zoneSetting=t}setFootlights(t){this.world?.setFootlights(t)}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=os(t.painting,t.rig),this.fx=null,await Promise.all((e.fonts??[]).map(r=>document.fonts?.load(r).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);this.disposed||(fu(this.camera,this.rig,this.view),this.#e(s),this.world=await new nc({scene:t,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings}).build(s),this.scene.add(this.world.group),this.zones=new ac({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.boardLabels=new oc({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.marks=new lc({scene:this.scene,tracker:this.tracker,softDot:this.softDot}),this.fx=new rc({scene:this.scene,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings,cardHeight:e.size.h*t.cardScale}),this.fx.calm=this.calm,this.chalkWall=new mc({scene:this.scene,rig:this.rig,tracker:this.tracker}),this.chalkBox=new gc({scene:this.scene,rig:this.rig,at:t.chalk.box??Xl,tracker:this.tracker}),this.chalkBox.setVisible(!1),this.chalkCursor=new xc({scene:this.scene,tracker:this.tracker}),await Promise.all(n.map(r=>this.addCard(r))),this.settings.post&&(this.post=new fc(this.renderer,this.scene,this.camera,{width:Math.round(this.width*this.ratio),height:Math.round(this.height*this.ratio),samples:this.settings.msaa}),this.post.setCalm(this.calm)),this.world.setFootlights(t.footlights),this.ready=!0)}#e(t){let e=new Js(this.renderer),n=new Pe(t);n.mapping=Ws,n.colorSpace=Ae,n.needsUpdate=!0;let s=e.fromEquirectangular(n);this.tracker.add(s),this.scene.environment=s.texture,this.scene.environmentIntensity=.6,n.dispose(),e.dispose()}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e={tracker:this.tracker,images:this.images,softDot:this.softDot,scene:this.scene,emoteTexture:s=>this.#i(s)},n=new sc(t,this.skin,e,this.description.cardScale*(t.size??1));if(await n.build(),this.disposed){n.dispose();return}this.views.set(t.id,n),this.scene.add(n.root,n.blob),t.emote?.id&&await n.setEmote(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){let e=this.views.get(t);e&&(e.dispose(),this.views.delete(t))}#i(t){if(this.emoteCache??=new Map,!this.emoteCache.has(t)){let e=Gl[t]?.svg;this.emoteCache.set(t,e?new Promise(n=>{let s=new Image;s.onload=()=>{let r=document.createElement("canvas");r.width=r.height=256,r.getContext("2d").drawImage(s,0,0,256,256),n(this.tracker.add(cn(r)))},s.onerror=()=>n(null),s.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}):Promise.resolve(null))}return this.emoteCache.get(t)}draw(t){if(!this.ready||this.disposed||this.contextLost)return;let e=t.t;this.world.update(e);for(let n of t.cards)this.views.get(n.id)?.pose(n);this.zones.update(t.zones,this.zoneSetting,e,t.board??null),this.boardLabels.update(t.board??null),this.marks.update(t.marks,this.views,e),this.fx.update(t.bonks,e),this.renderer.info.reset(),this.post?this.post.render(e):this.renderer.render(this.scene,this.camera)}#n(t,e){let n=new bt(t/this.width*2-1,-(e/this.height*2-1)),s=new jr;return s.setFromCamera(n,this.camera),s}pick(t,e){if(!this.ready)return null;let n=[];for(let a of this.views.values())n.push(...a.pickables);if(this.chalkBox?.group.visible&&n.push(...this.chalkBox.pickables),!n.length)return null;let s=this.#n(t,e).intersectObjects(n,!1)[0];if(!s)return null;let r={x:s.point.x,y:s.point.y,z:s.point.z};return s.object.userData.chalk?{kind:"chalk",colour:s.object.userData.chalk,point:r}:s.object.userData.eraser?{kind:"eraser",point:r}:{kind:"card",id:s.object.userData.cardId,point:r}}paintingAt(t,e){let n=new Qe(new D(0,0,1),tc),s=new D;if(!this.#n(t,e).ray.intersectPlane(n,s))return null;let{cx:r,cy:a,f:o,floorY:l}=this.rig.cam,c=o/(o+tc),h=r+s.x*c,d=a+(l-a-s.y)*c,[u,f]=this.rig.fractionOfScreen(h,d);return u>=0&&u<=1&&f>=0&&f<=1?{x:u,y:f}:null}floorAt(t,e,n=0){let s=new Qe(new D(0,1,0),-n),r=new D;return this.#n(t,e).ray.intersectPlane(s,r)?{x:r.x,z:r.z}:null}project({X:t,Y:e,Z:n}){let s=this.rig.screenOf(t,e,n);return{x:(s.x-this.view.ox)*this.view.s,y:(s.y-this.view.oy)*this.view.s,k:s.k}}setChalkStrokes(t){this.chalkWall?.set(t)}addChalkStroke(t){this.chalkWall?.add(t)}removeChalkStrokes(t){this.chalkWall?.remove(t)}setChalkPreview(t,e,n){this.chalkWall?.setPreview(t,e,n)}setChalkHidden(t){this.chalkWall?.setHidden(t)}setChalkBox(t){this.chalkBox?.setVisible(t)}setChalkCursor(t,e,n=!1){if(!this.chalkCursor)return;if(!t){this.chalkCursor.set(null);return}let s=new Qe(new D(0,0,1),200),r=new D;if(!this.#n(t.x,t.y).ray.intersectPlane(s,r)){this.chalkCursor.set(null);return}this.chalkCursor.set(r,e,n)}async capture(){return this.post?this.post.render(0):this.renderer.render(this.scene,this.camera),new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){let t=this.renderer?.info;return t?{calls:t.render.calls,triangles:t.render.triangles,textures:t.memory.textures,geometries:t.memory.geometries,tracked:this.tracker.size}:null}unmount(){this.canvas?.remove()}dispose(){if(!this.disposed){this.disposed=!0;for(let t of this.views.values())t.dispose();this.views.clear(),this.post?.dispose(),this.tracker?.disposeAll(),this.scene?.environment?.dispose?.(),this.renderer?.dispose(),this.contextLost||this.renderer?.forceContextLoss(),this.unmount()}}};var wa=Math.PI/180,CT=Object.freeze([1,0,0,1,0,0]),Sa=(i,t)=>[i[0]*t[0]+i[2]*t[1],i[1]*t[0]+i[3]*t[1],i[0]*t[2]+i[2]*t[3],i[1]*t[2]+i[3]*t[3],i[0]*t[4]+i[2]*t[5]+i[4],i[1]*t[4]+i[3]*t[5]+i[5]],Op=(i,t)=>[1,0,0,1,i,t],Bp=(i,t=i)=>[i,0,0,t,0,0],zp=i=>[Math.cos(i),Math.sin(i),-Math.sin(i),Math.cos(i),0,0],Uv=(i,t,e)=>({x:i[0]*t+i[2]*e+i[4],y:i[1]*t+i[3]*e+i[5]});function Fv(i){let t=i[0]*i[3]-i[1]*i[2];return Math.abs(t)<1e-12?null:[i[3]/t,-i[1]/t,-i[2]/t,i[0]/t,(i[2]*i[5]-i[3]*i[4])/t,(i[1]*i[4]-i[0]*i[5])/t]}var yc=(i,t,e)=>({x:(t-i.ox)*i.s,y:(e-i.oy)*i.s}),Hp=(i,t,e)=>({x:t/i.s+i.ox,y:e/i.s+i.oy});function Ri(i,t,{X:e,Y:n,Z:s}){let r=i.screenOf(e,n,s);return{...yc(t,r.x,r.y),k:r.k}}function Vp(i,t,e,n,s=0){let{cam:r}=i,a=Hp(t,e,n),o=r.floorY-s-r.cy;if(o===0)return null;let l=(a.y-r.cy)/o;return l>0?{x:(a.x-r.cx)/l,z:r.f-r.f/l}:null}function Gp(i,t,e,n){let s=Hp(t,e,n),[r,a]=i.fractionOfScreen(s.x,s.y);return r>=0&&r<=1&&a>=0&&a<=1?{x:r,y:a}:null}function mu(i,t,e,{stickLen:n=134}={}){let s=i.grip??0,r=i.scale??1,a=t.screenOf(i.x,i.lift??0,i.z),o=yc(e,a.x,a.y),l=a.k*e.s,c=1-.45*s,h=(i.lean??0)*wa,d=n*r*s,u=(i.yaw??0)*wa,f=Math.cos(u),x=Math.max(.55,Math.cos((i.pitch??0)*wa)),g=Sa(Op(o.x,o.y),Sa(Bp(l),zp(h*c))),m=Sa(g,Sa(Op(0,-d),zp(h*(1-c)))),p=r*Math.max(.03,Math.abs(f)),b=r*(i.breathe??1)*(i.squash??1)*x;return{m:Sa(m,Bp(p,b)),stick:g,at:o,k:a.k,px:l,back:f<0,side:Math.abs(Math.sin(u)),hinge:d,share:c}}function Wp(i,t,e,n,s){let r=Fv(i.m);if(!r)return null;let a=Uv(r,n,s),{w:o,h:l}=e;if(a.x<-o/2||a.x>o/2||a.y<-l||a.y>ji.depth)return null;let c=Math.max(0,-a.y)*(t.scale??1)*(t.breathe??1)*(t.squash??1);return(t.lift??0)+i.hinge+c}var ji=Object.freeze({width:.5,depth:12}),Xp=(i,t)=>i.z-t.z;var Zp=-10*wa,Ta=Object.freeze({at:[Ai.width/2-34,20,4],size:[50,32,30],hit:{y0:0,y1:60,half:29}});function $p(i,t,e){let n=i.standing(e);if(!n)return null;let s=Math.cos(Zp),r=Math.sin(Zp),a=(y,T,R)=>Ri(i,t,{X:n.X+y*s+R*r,Y:T,Z:n.Z-y*r+R*s}),o=y=>y.map(([T,R,U])=>{let F=a(T,R,U);return[F.x,F.y]}),{width:l,depth:c,wall:h,stick:d,hit:u}=Ai,f=4+h,x=tr.map((y,T)=>{let R=d.first+T*d.spacing,U=(T%2-.5)*6,F=(T%3-1)*.07,B=a(R,-2,U),P=a(R-Math.sin(F)*d.height,-2+Math.cos(F)*d.height,U),O=a(R,4+u.height/2-14-u.height/2,0),W=a(R,4+u.height/2-14+u.height/2,0),Z=u.radius*O.k*t.s;return{colour:y,base:{x:B.x,y:B.y},top:{x:P.x,y:P.y},width:2*d.radius*B.k*t.s,hit:{x0:O.x-Z,x1:O.x+Z,y0:W.y,y1:O.y}}}),[g,m,p]=Ta.at,[b,C,M]=Ta.size,w=a(g,Ta.hit.y0,p),S=a(g,Ta.hit.y1,p),A=Ta.hit.half*w.k*t.s;return{z:n.Z,floor:o([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,4,c/2],[-l/2,4,c/2]]),back:o([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,f,-c/2],[-l/2,f,-c/2]]),left:o([[-l/2,4,-c/2],[-l/2,4,c/2],[-l/2,f,c/2],[-l/2,f,-c/2]]),right:o([[l/2,4,-c/2],[l/2,4,c/2],[l/2,f,c/2],[l/2,f,-c/2]]),front:o([[-l/2,4,c/2],[l/2,4,c/2],[l/2,f,c/2],[-l/2,f,c/2]]),sticks:x,eraser:{front:o([[g-b/2,m-C/2,p+M/2],[g+b/2,m-C/2,p+M/2],[g+b/2,m+C/2,p+M/2],[g-b/2,m+C/2,p+M/2]]),top:o([[g-b/2,m+C/2,p-M/2],[g+b/2,m+C/2,p-M/2],[g+b/2,m+C/2,p+M/2],[g-b/2,m+C/2,p+M/2]]),hit:{x0:w.x-A,x1:w.x+A,y0:S.y,y1:w.y}}}}var qp=(i,t,e)=>t>=i.x0&&t<=i.x1&&e>=i.y0&&e<=i.y1;function Yp(i,t,e){if(!i)return null;if(qp(i.eraser.hit,t,e))return{kind:"eraser"};for(let n of i.sticks)if(qp(n.hit,t,e))return{kind:"chalk",colour:n.colour};return null}var Jp=.42,Kp=.2,jp=.8,Qp=22,kv=3,Ov=1,gu=(i,t="#80512d")=>typeof i=="number"?`#${i.toString(16).padStart(6,"0")}`:t;function xu(i,t){let e=Math.min(2048,i),n=Math.round(e*t/i),s=document.createElement("canvas");return s.width=e,s.height=n,{canvas:s,ctx:s.getContext("2d"),cw:e,ch:n}}var vc=class{constructor({images:t,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="flat",this.capabilities={lights:!1,shadows:!1,post:!1,particles:!1,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!1},this.tier="flat",this.views=new Map,this.adding=new Set,this.emotes=new Map,this.calm=!1,this.zoneSetting="faint",this.disposed=!1,this.ready=!1,this.order=[],this.flashes=[],this.zoneKey="",this.revision=0,this.strokes=new Map,this.hidden=!1,this.boxShown=!1,this.cursor=null,this.preview=null,this.draws=0}mount(t,{pixelRatio:e=1,width:n=1280,height:s=720}={}){if(this.element=t,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.ctx=this.canvas.getContext("2d",{alpha:!1}),!this.ctx)throw new Error("this browser cannot draw on a 2D canvas");this.#t(n,s,e)}#t(t,e,n){this.width=t,this.height=e,this.ratio=Math.min(n||1,Ov),this.view=gr(t,e),this.canvas.width=Math.max(1,Math.round(t*this.ratio)),this.canvas.height=Math.max(1,Math.round(e*this.ratio)),this.backdrop=null,this.backdropKey="",this.occluderBitmaps=null,this.boxCache=null}resize(t,e,n=1){this.disposed||this.#t(t,e,n)}setQuality(){}setCalm(t){this.calm=!!t}setZoneSetting(t){this.zoneSetting=t,this.zoneKey=""}setFootlights(){}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=os(t.painting,t.rig),await Promise.all((e.fonts??[]).map(o=>document.fonts?.load(o).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);if(this.disposed)return;this.painting=s;let[r,a]=this.rig.size;this.zoneLayer=xu(r,a),this.keptLayer=xu(r,a),this.liveLayer=xu(r,a),this.impact=Yl(),this.markImage=Jl(),this.labelImages=new Map,this.occluders=t.occluders.map(o=>{let l=this.rig.standing([o.x,o.base]);return l?{poly:o.poly.map(([c,h])=>[this.rig.map.x(c),this.rig.map.y(h)]),z:l.Z}:null}).filter(Boolean),await Promise.all(n.map(o=>this.addCard(o))),this.ready=!0}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e={loadImage:this.images.loadImage},[n,s]=await Promise.all([this.skin.face(t,e),this.skin.back(t,e)]);if(this.disposed)return;this.views.set(t.id,{id:t.id,person:t,face:this.#e(n),back:this.#e(s),w:this.skin.size.w,h:this.skin.size.h}),t.emote?.id&&this.#i(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){this.views.delete(t)}#e(t){let{w:e,h:n}=this.skin.size;if(!(t.width>e*1.3))return t;let s=document.createElement("canvas");s.width=e,s.height=n;let r=s.getContext("2d");return r.imageSmoothingQuality="high",r.drawImage(t,0,0,e,n),s}#i(t){if(this.emotes.has(t))return this.emotes.get(t);this.emotes.set(t,null);let e=Gl[t]?.svg;if(e){let n=new Image;n.onload=()=>this.emotes.set(t,n),n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}return null}#n(){let{view:t,ratio:e}=this;this.#s([t.s,0,0,t.s,-t.ox*t.s,-t.oy*t.s],e)}#s(t,e=this.ratio){this.ctx.setTransform(t[0]*e,t[1]*e,t[2]*e,t[3]*e,t[4]*e,t[5]*e)}#r(){return this.boxShown?(this.boxCache??={layout:$p(this.rig,this.view,this.description.chalk?.box??Xl)},this.boxCache.layout):null}#a(t,e){let{rig:n,view:s,ratio:r}=this,a=t.board??null,o=this.description.zones.length?ql(this.description.zones,t.zones,this.zoneSetting,e,a):"",l=`${this.canvas.width}x${this.canvas.height}|${o}|${this.revision}|${this.hidden?1:0}`;if(this.backdrop&&l===this.backdropKey)return;if(this.backdropKey=l,!this.backdrop){let p=document.createElement("canvas");p.width=this.canvas.width,p.height=this.canvas.height,this.backdrop={canvas:p,ctx:p.getContext("2d",{alpha:!1})}}let c=this.backdrop.ctx,h=n.map,[d,u]=n.size;c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.fillStyle="#0c0a08",c.fillRect(0,0,this.canvas.width,this.canvas.height),c.setTransform(s.s*r,0,0,s.s*r,-s.ox*s.s*r,-s.oy*s.s*r),c.imageSmoothingQuality="high";let f=d*h.s,x=u*h.s;c.drawImage(this.painting,h.ox,h.oy,f,x);let g=h.oy+x,m=s.oy+s.visH-g;if(m>0){let p=Math.min(m+8,x*.6);c.save(),c.globalAlpha=.55,c.translate(0,g),c.scale(1,-1),c.drawImage(this.painting,0,u-p/h.s,d,p/h.s,h.ox,-p,f,p),c.restore()}this.zoneLayer&&this.description.zones.length&&(o!==this.zoneKey&&(this.zoneKey=o,$l(this.zoneLayer.ctx,this.zoneLayer.cw,this.zoneLayer.ch,this.description.zones,t.zones,this.zoneSetting,e,a)),c.drawImage(this.zoneLayer.canvas,h.ox,h.oy,f,x)),this.hidden||(c.globalAlpha=.82,c.drawImage(this.keptLayer.canvas,h.ox,h.oy,f,x),c.drawImage(this.liveLayer.canvas,h.ox,h.oy,f,x),c.globalAlpha=1)}draw(t){if(!this.ready||this.disposed)return;let{ctx:e,rig:n,view:s}=this,r=t.t;this.draws++,e.imageSmoothingQuality="medium",this.#a(t,r),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.drawImage(this.backdrop.canvas,0,0),this.#o(t,r),this.#l(t);let a=[];for(let l of t.cards){let c=this.views.get(l.id);c&&a.push({kind:"card",z:l.z,c:l,v:c,pl:mu(l,n,s,{stickLen:this.skin.stick?.length??134})})}for(let l of this.occluders)a.push({kind:"occluder",z:l.z,o:l});let o=this.#r();o&&a.push({kind:"box",z:o.z,layout:o}),a.sort(Xp);for(let l of a)l.kind==="card"?this.#h(l.c,l.v,l.pl):l.kind==="occluder"?this.#c(l.o):this.#d(l.layout);this.order=a,this.#p(t),this.#g(t,r),this.#_()}#l(t){let{ctx:e,rig:n}=this;this.#n();for(let s of t.cards){let r=this.views.get(s.id);if(!r)continue;let a=s.grip??0,o=s.scale??1,l=n.screenOf(s.x,.6,s.z),c=r.w*o*(.95+.5*a)/2*l.k,h=(74+46*a)/2,d=n.screenOf(s.x,.6,s.z+h),u=n.screenOf(s.x,.6,s.z-h),f=Math.max(2,Math.abs(d.y-u.y)/2);if(s.selected){e.globalAlpha=.85,e.fillStyle="#ff9a46",e.beginPath(),e.ellipse(l.x,l.y,c*1.45,f*1.6,0,0,Math.PI*2),e.fill();continue}e.globalAlpha=.62-.26*a,e.fillStyle="#000",e.beginPath(),e.ellipse(l.x,l.y,c,f,0,0,Math.PI*2),e.fill()}e.globalAlpha=1}#o(t,e){let{ctx:n,rig:s}=this;this.#n();for(let r of t.marks.slice(0,6)){let a=r.target?1+.06*Math.sin(e*7):1,o=s.screenOf(r.X,1.2,r.Z),l=(r.target?190:150)*a*o.k,c=(r.target?120:96)*a/2,h=Math.abs(s.screenOf(r.X,1.2,r.Z+c).y-s.screenOf(r.X,1.2,r.Z-c).y);n.globalAlpha=Math.min(1,r.alpha)*(r.target?1:.8),n.drawImage(this.markImage,o.x-l/2,o.y-h/2,l,Math.max(h,4))}n.globalAlpha=1}#c(t){this.occluderBitmaps??=new Map;let e=this.occluderBitmaps.get(t);e===void 0&&(e=this.#u(t),this.occluderBitmaps.set(t,e)),e&&(this.ctx.setTransform(1,0,0,1,0,0),this.ctx.drawImage(e.canvas,e.x,e.y))}#u(t){let{view:e,ratio:n,rig:s}=this,r=t.poly.map(([x,g])=>yc(e,x,g)),a=Math.max(0,Math.floor(Math.min(...r.map(x=>x.x))*n)),o=Math.max(0,Math.floor(Math.min(...r.map(x=>x.y))*n)),l=Math.min(this.canvas.width,Math.ceil(Math.max(...r.map(x=>x.x))*n)),c=Math.min(this.canvas.height,Math.ceil(Math.max(...r.map(x=>x.y))*n));if(l<=a||c<=o)return null;let h=document.createElement("canvas");h.width=l-a,h.height=c-o;let d=h.getContext("2d");d.imageSmoothingQuality="high",d.setTransform(e.s*n,0,0,e.s*n,-e.ox*e.s*n-a,-e.oy*e.s*n-o),d.beginPath(),t.poly.forEach(([x,g],m)=>m?d.lineTo(x,g):d.moveTo(x,g)),d.closePath(),d.clip();let[u,f]=s.size;return d.drawImage(this.painting,s.map.ox,s.map.oy,u*s.map.s,f*s.map.s),{canvas:h,x:a,y:o}}#h(t,e,n,{ghost:s=!1}={}){let{ctx:r,skin:a}=this,o=e.w,l=e.h,c=t.scale??1,h=t.grip??0;if(!s&&h>.02){this.#s(n.stick);let f=n.hinge,x=gu(a.stick?.wood),g=gu(a.stick?.collar,"#b8924f"),m=Math.min(18*c,f);r.fillStyle=x,r.beginPath(),r.moveTo(-6.4*c,0),r.lineTo(-8.5*c,-f+m),r.lineTo(8.5*c,-f+m),r.lineTo(6.4*c,0),r.arc(0,0,6.4*c,0,Math.PI),r.closePath(),r.fill(),r.fillStyle="rgba(255,255,255,0.16)",r.fillRect(-4*c,-f+m,2.4*c,f-m),r.fillStyle=g,r.fillRect(-12.5*c,-f,25*c,m),r.fillStyle="rgba(0,0,0,0.25)",r.fillRect(-12.5*c,-f+m-3*c,25*c,3*c),r.strokeStyle=e.person.colour??"#e8e0c8",r.lineWidth=3.6,r.globalAlpha=Math.min(1,h*2),r.beginPath(),r.ellipse(0,0,21,9,0,0,Math.PI*2),r.stroke(),r.globalAlpha=1}this.#s(n.m),s&&(r.globalAlpha=.35);let d=gu(a.materials?.body?.color,"#e7dfcd"),u=(a.thickness??9)*n.side/2;r.fillStyle=d,r.fillRect(-o*ji.width/2,0,o*ji.width,ji.depth),e.person.colour&&(r.fillStyle=e.person.colour,r.fillRect(-o*ji.width/2+4,1,o*ji.width-8,3)),r.fillStyle=d,r.fillRect(-o/2-u,-l+2,o+u*2,l-2),r.drawImage(n.back?e.back:e.face,-o/2,-l,o,l),s&&(r.globalAlpha=1)}#d(t){let{ctx:e}=this,n=(s,r)=>{e.fillStyle=r,e.beginPath(),s.forEach(([a,o],l)=>l?e.lineTo(a,o):e.moveTo(a,o)),e.closePath(),e.fill(),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=1,e.stroke()};this.#s([1,0,0,1,0,0]),n(t.floor,"#3a2412"),n(t.back,"#6a4628");for(let s of t.sticks)e.lineCap="round",e.strokeStyle=Yi(s.colour),e.lineWidth=s.width,e.beginPath(),e.moveTo(s.base.x,s.base.y),e.lineTo(s.top.x,s.top.y),e.stroke();n(t.left,"#7a5230"),n(t.right,"#7a5230"),n(t.front,"#8a5e38"),n(t.eraser.front,"#5b6670"),n(t.eraser.top,"#6c7882")}#p(t){let{ctx:e,rig:n,view:s}=this;for(let r of t.marks.slice(0,6)){if(!r.target)continue;let a=this.views.get(r.for);if(!a)continue;let o=this.description.cardScale*(a.person.size??1),l={x:r.X,z:r.Z,lift:r.pose.lift,lean:r.pose.lean,yaw:r.pose.yaw,pitch:r.pose.pitch,grip:0,scale:o,breathe:1,squash:1};if(this.#h(l,a,mu(l,n,s,{stickLen:0}),{ghost:!0}),r.label){let c=Ri(n,s,{X:r.X,Y:r.pose.lift+a.h*o+40,Z:r.Z}),h=this.#m(r.label),d=260*c.k*s.s;this.#s([1,0,0,1,0,0]),e.drawImage(h,c.x-d/2,c.y-d*96/512/2,d,d*96/512)}}for(let r of t.cards){let a=r.emote;if(!a||a.opacity<=.01)continue;let o=this.#i(a.id),l=this.views.get(r.id);if(!o||!l)continue;let c=r.scale??1,h=Ri(n,s,{X:r.x+74*c,Y:(r.lift??0)+(this.skin.stick?.length??134)*c*(r.grip??0)+l.h*c*(r.breathe??1)+36,Z:r.z+30}),d=96*a.pop*h.k*s.s;this.#s([1,0,0,1,0,0]),e.globalAlpha=a.opacity,e.drawImage(o,h.x-d/2,h.y-d/2,d,d),e.globalAlpha=1}}#m(t){return this.labelImages.has(t)||this.labelImages.set(t,Kl(t)),this.labelImages.get(t)}#g(t){let{ctx:e,rig:n,view:s}=this,r=t.t,a=this.skin.size.h*this.description.cardScale*.5+60;this.#s([1,0,0,1,0,0]);let o=0;for(let l of t.bonks){let c=r-l.t;if(c<0||c>jp)continue;let h=Ri(n,s,{X:l.x,Y:a+10,Z:l.Z+90});if(c<Jp&&o++<3){let d=c/Jp,u=(120+150*Math.sqrt(d))*h.k*s.s;e.save(),e.translate(h.x,h.y),e.rotate(.2*d),e.globalAlpha=1-d*d,e.drawImage(this.impact,-u/2,-u/2,u,u),e.restore()}if(!this.calm){if(c<Kp&&this.#x(l.t)){let d=260*h.k*s.s,u=.4*(1-c/Kp)**2,f=e.createRadialGradient(h.x,h.y,0,h.x,h.y,d);f.addColorStop(0,`rgba(255,226,168,${u})`),f.addColorStop(1,"rgba(255,226,168,0)"),e.globalCompositeOperation="lighter",e.fillStyle=f,e.fillRect(h.x-d,h.y-d,d*2,d*2),e.globalCompositeOperation="source-over"}if(l===t.bonks[t.bonks.length-1]){e.globalCompositeOperation="lighter",e.fillStyle="#ffd98a",e.globalAlpha=Math.max(0,1-c/jp);for(let d=0;d<Qp;d++){let u=d/Qp*Math.PI*2+d%5*.37,f=260+d*53%340,x=Ri(n,s,{X:l.x+Math.cos(u)*f*c,Y:Math.max(2,a+Math.sin(u)*f*.8*c+120*c-900*c*c),Z:l.Z+90});e.beginPath(),e.arc(x.x,x.y,Math.max(1.2,3*x.k*s.s),0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}e.globalAlpha=1}}e.globalAlpha=1}#x(t){return this.flashes.includes(t)?!0:(this.flashes=this.flashes.filter(e=>t-e<1),this.flashes.length>=kv?!1:(this.flashes.push(t),!0))}#_(){let t=this.cursor;if(!t)return;let{ctx:e,view:n}=this,s=.93*n.s,r=t.tool==="rub";this.#s([1,0,0,1,0,0]),e.save(),e.translate(t.x,t.y-(t.drawing?10:36)*s),e.rotate(r?0:.6+Math.max(-.5,Math.min(.5,t.vx/4e3))),r?(e.fillStyle="#5b6670",e.fillRect(-25*s,-16*s,50*s,32*s)):(e.fillStyle=Yi(t.tool),e.fillRect(-8*s,-31*s,16*s,62*s),e.fillStyle="rgba(255,255,255,0.35)",e.fillRect(-8*s,25*s,16*s,6*s)),e.restore()}pick(t,e){if(!this.ready)return null;for(let n=this.order.length-1;n>=0;n--){let s=this.order[n];if(s.kind==="card"){let r=Wp(s.pl,s.c,s.v,t,e);if(r!==null)return{kind:"card",id:s.c.id,point:{x:0,y:r,z:s.c.z}}}else if(s.kind==="box"){let r=Yp(s.layout,t,e);if(r)return{...r,point:{x:0,y:0,z:s.z}}}}return null}paintingAt(t,e){return this.rig?Gp(this.rig,this.view,t,e):null}floorAt(t,e,n=0){return this.rig?Vp(this.rig,this.view,t,e,n):null}project(t){return Ri(this.rig,this.view,t)}#f(t,e){xa(t.ctx,t.cw,t.ch,er(e),e.colour,e.size,ir(e.id))}#y(){let t=this.keptLayer;if(t){t.ctx.clearRect(0,0,t.cw,t.ch);for(let e of this.strokes.values())this.#f(t,e)}}setChalkStrokes(t){this.strokes=new Map(t.map(e=>[e.id,e])),this.#y(),this.revision++}addChalkStroke(t){this.strokes.has(t.id)||(this.strokes.set(t.id,t),this.keptLayer&&this.#f(this.keptLayer,t),this.revision++)}removeChalkStrokes(t){let e=!1;for(let n of t)e=this.strokes.delete(n)||e;e&&(this.#y(),this.revision++)}setChalkPreview(t,e,n){let s=this.liveLayer;s&&(s.ctx.clearRect(0,0,s.cw,s.ch),this.revision++,this.preview=t&&t.length?{points:t,colour:e,size:n}:null,this.preview&&xa(s.ctx,s.cw,s.ch,t,e,n,ir("preview")))}setChalkHidden(t){this.hidden=!!t}setChalkBox(t){this.boxShown=!!t}setChalkCursor(t,e,n=!1){if(!t){this.cursor=null;return}let s=performance.now(),r=this.cursor,a=r?(t.x-r.x)/Math.max(s-r.at,1)*1e3:0;this.cursor={x:t.x,y:t.y,tool:e,drawing:n,vx:a,at:s}}async capture(){return new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){return{calls:this.draws,triangles:0,textures:0,geometries:0,tracked:this.views.size}}unmount(){this.canvas?.remove()}dispose(){this.disposed||(this.disposed=!0,this.views.clear(),this.order=[],this.unmount())}};function tm({tier:i,webgl:t,failed:e=!1,software:n=!1}){return i==="flat"||!t||e||n?"flat":"three"}var Bv=/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i,zv=i=>Bv.test(String(i??"")),_u=null;function em(i=globalThis.document){if(_u!==null)return _u;let t={ok:!1,renderer:""};try{let e=i.createElement("canvas"),n=e.getContext("webgl2")??e.getContext("webgl");if(n){let s=n.getExtension?.("WEBGL_debug_renderer_info");t={ok:!0,renderer:String((s?n.getParameter?.(s.UNMASKED_RENDERER_WEBGL):n.getParameter?.(n.RENDERER))??"")},n.getExtension?.("WEBGL_lose_context")?.loseContext()}}catch{t={ok:!1,renderer:""}}return _u=t,t}var nm=i=>em(i).ok,im=i=>{let t=em(i);return t.ok&&zv(t.renderer)};var yu="module.stagecraft";function sm(i){let t=(e,n)=>i(e,n);return game.socket.on(yu,t),{send:e=>game.socket.emit(yu,e),close:()=>game.socket.off(yu,t)}}var rm="medium",Hv=.0018,Vv=.018,Gv=()=>`${game.user.id.slice(0,6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,Mc=class{constructor({host:t,store:e}){this.host=t,this.store=e,this.sceneId=t.scene.id,this.known=new Map,this.pending=new Map,this.rubbed=new Set,this.inHand=null,this.drawing=null,this.unsubscribe=e.onChange(n=>{n===null?(this.refresh(),this.sync()):n===this.sceneId&&this.sync()})}stop(){this.unsubscribe?.(),this.putAway()}reset(){this.known=new Map,this.putAway()}policy(){let t=this.host.scene.flags?.[st]?.live?.chalk??null;return Zl(this.host.description.chalk,t)}refresh(){let t=this.policy(),e=this.store.ready&&hu(t,this.host.description.zones);return this.host.backend.setChalkBox(e),(!e||t.locked)&&this.putAway(),this.host.backend.setChalkHidden(this.host.scene.flags?.[st]?.live?.chalkHidden===!0),t}sync(){let t=new Map;for(let n of this.store.strokes(this.sceneId))this.rubbed.has(n.id)||t.set(n.id,n);for(let[n,s]of this.pending)t.set(n,s);let e=[...this.known.keys()].filter(n=>!t.has(n));e.length&&this.host.backend.removeChalkStrokes(e);for(let[n,s]of t)this.known.has(n)||this.host.backend.addChalkStroke(s);this.known=t}get usable(){return this.store.ready&&hu(this.policy(),this.host.description.zones)}take(t){if(this.usable){if(this.inHand===t){this.putAway();return}this.inHand=t,this.host.root.classList.add("stagecraft-chalk")}}putAway(){this.inHand=null,this.drawing=null,this.host?.root?.classList.remove("stagecraft-chalk"),this.host?.backend?.setChalkCursor(null),this.host?.backend?.setChalkPreview(null)}hover(t){if(this.inHand){if(!t){this.host.backend.setChalkCursor(null);return}this.host.backend.setChalkCursor(t,this.inHand,!!this.drawing),this.drawing&&this.#t(t)}}begin(t){if(!this.inHand)return!1;let e=this.host.backend.paintingAt(t.x,t.y);return e?(this.drawing={points:[[e.x,e.y]]},this.#e(),!0):!1}#t(t){let e=this.host.backend.paintingAt(t.x,t.y);if(!e)return;let n=this.drawing.points[this.drawing.points.length-1];Math.hypot(e.x-n[0],e.y-n[1])<Hv||(this.drawing.points.push([e.x,e.y]),this.#e())}#e(){if(this.inHand==="rub")return;let t=uu(this.drawing.points,this.policy(),this.host.description.zones);this.host.backend.setChalkPreview(t.flat(),this.inHand,rm)}async end(){let t=this.drawing;if(this.drawing=null,this.host.backend.setChalkPreview(null),!t||!this.store.ready)return;if(this.inHand==="rub")return this.#i(t.points);let e=[];for(let n of uu(t.points,this.policy(),this.host.description.zones)){let s=lu({id:Gv(),scene:this.sceneId,by:game.user.id,at:Date.now(),colour:this.inHand,size:rm,points:n});s.ok&&e.push(s.stroke)}for(let n of e)this.pending.set(n.id,n),this.known.set(n.id,n),this.host.backend.addChalkStroke(n),Hooks.callAll("stagecraft.chalk",{type:"chalk",stroke:n,bounds:Mp(n),by:game.user.id});for(let n of e)try{await this.store.append(this.sceneId,n)}catch(s){console.warn(`${st} | could not keep a chalk stroke`,s)}finally{this.pending.delete(n.id)}this.sync(),await this.#n()}async#i(t){let e=r=>game.user.isGM||r.by===game.user.id,{removed:n,added:s}=Sp([...this.known.values()],t,Vv,e);if(n.length){for(let r of n)this.rubbed.add(r),this.pending.delete(r),this.known.delete(r);this.host.backend.removeChalkStrokes(n);for(let r of s)this.pending.set(r.id,r),this.known.set(r.id,r),this.host.backend.addChalkStroke(r);try{await this.store.remove(this.sceneId,n);for(let r of s)await this.store.append(this.sceneId,r)}catch(r){console.warn(`${st} | could not rub out chalk`,r)}finally{for(let r of n)this.rubbed.delete(r);for(let r of s)this.pending.delete(r.id);this.sync()}}}async#n(){let{overflow:t}=wp([...this.known.values()],ei.strokesPerScene);if(!t.length)return;let e=t.map(n=>n.id);for(let n of e)this.rubbed.add(n);try{await this.store.remove(this.sceneId,e)}catch(n){console.warn(`${st} | could not trim the chalk wall`,n)}finally{for(let n of e)this.rubbed.delete(n);this.sync()}}allowedAt(t){return cu(this.policy(),this.host.description.zones,t.x,t.y)}};var ze=(i,t)=>t?game.i18n.format(`STAGECRAFT.Bar.${i}`,t):game.i18n.localize(`STAGECRAFT.Bar.${i}`),Wv=["hands","mode","freeze","undo","wipe","hide"],bc=class{constructor(t){this.host=t,this.el=document.createElement("div"),this.el.className="stagecraft-bar",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",ze("Label")),this.el.innerHTML=Wv.map(e=>`<button type="button" data-act="${e}"></button>`).join(""),t.root.append(this.el),this.el.addEventListener("click",this.#i),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#i),this.el?.remove(),this.el=null}get#t(){return this.host.scene}get#e(){return this.#t.flags?.[st]?.live??{}}refresh(){if(!this.el)return;let t=this.host.chalk;if(!t){this.el.hidden=!0;return}this.el.hidden=!1;let e=t.policy(),n=this.#e.chalk?.mode??null,s=(r,a,{on:o=!1,tip:l="",disabled:c=!1}={})=>{let h=this.el.querySelector(`[data-act="${r}"]`);h.textContent=a,h.title=l,h.setAttribute("aria-pressed",o?"true":"false"),h.classList.toggle("on",o),h.disabled=c};s("hands",ze("Hands.Label"),{on:as(this.#t),tip:ze("Hands.Tip")}),s("mode",n?ze("Mode.Set",{mode:ze(`Mode.${n}`)}):ze("Mode.Scene",{mode:ze(`Mode.${e.mode}`)}),{on:!!n,tip:ze("Mode.Tip")}),s("freeze",ze("Freeze.Label"),{on:e.locked,tip:ze("Freeze.Tip")}),s("undo",ze("Undo.Label"),{tip:ze("Undo.Tip"),disabled:!t.store.ready}),s("wipe",ze("Wipe.Label"),{tip:ze("Wipe.Tip"),disabled:!t.store.ready}),s("hide",ze("Hide.Label"),{on:this.#e.chalkHidden===!0,tip:ze("Hide.Tip")})}#i=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#n(e.dataset.act).catch(n=>console.warn(`${st} | the stage bar could not do "${e.dataset.act}"`,n))};async#n(t){let e=this.#t,n=this.host.chalk,s=n?.store;if(t==="hands")await e.update({[`flags.${st}.live.handsOff`]:!as(e)});else if(t==="mode")await e.update({[`flags.${st}.live.chalk.mode`]:bp(this.#e.chalk?.mode)});else if(t==="freeze")await e.update({[`flags.${st}.live.chalk.locked`]:!n.policy().locked});else if(t==="hide")await e.update({[`flags.${st}.live.chalkHidden`]:this.#e.chalkHidden!==!0});else if(t==="undo"){let r=s.strokes(e.id).at(-1);r&&await s.remove(e.id,[r.id])}else t==="wipe"&&await foundry.applications.api.DialogV2.confirm({window:{title:ze("Wipe.Title")},content:`<p>${ze("Wipe.Ask")}</p>`,yes:{default:!1}})&&await s.wipe(e.id);this.refresh()}};var Xv=.45,Sc=()=>(globalThis.game?.time?.serverTime??Date.now())/1e3,am=Promise.resolve();function Mu(i){let t=am.then(i,i);return am=t.catch(e=>console.warn(`${st} | a write to the stage failed`,e)),t}function om(i,t=null){if(t?.scene?.id===i.id&&t.stage)return t.stage;let{usable:e,scene:n}=ss(i);return e?new hs(n,fr(i),{clock:Sc}):null}function Ea(i,t){return!game.user?.isGM||!t?.length?Promise.resolve(!1):Mu(async()=>{let e=La(i),n=wd(e,t,Sc()+Xv);return await i.update({[`flags.${st}.published.cards`]:n}),!0})}async function Aa(i,t,e={},n=null){let s=om(i,n);if(!s)return[];let r=s.formationMoves(t,e);return await Ea(i,r),r}async function wc(i,{gait:t="walk"}={}){let e=Td(La(i),{gait:t});return await Ea(i,e),e}async function Tc(i,t=null){let e=om(i,t);if(!e)return[];let n=e.marks.map(a=>({...a,capacity:a.capacity-(e.resting.get(a.id)?.size??0)})).filter(a=>a.capacity>0),s=[...e.cards.values()].filter(a=>!a.mark&&a.holder===null).map(a=>({id:a.id,X:a.walk?a.walk.to.X:a.puppet.x,Z:a.walk?a.walk.to.Z:a.Z})),r=Ba(n,s).map(({card:a,mark:o})=>({id:a,mark:o,gait:"hurry",still:!0,packed:!1}));return await Ea(i,r),r}var or=i=>i?.flags?.[st]?.live?.life!==!1;function lr(i){let t=i?.flags?.[st]?.live?.board;return typeof t=="boolean"?t:i?.flags?.[st]?.stage?.board===!0}var Ec=(i,t)=>i.update({[`flags.${st}.live.life`]:!!t}),Ac=(i,t)=>i.update({[`flags.${st}.live.board`]:!!t}),vu=new Set;function lm(i){if(typeof i!="function")throw new TypeError("a moments provider must be a function of the scene");return vu.add(i),()=>vu.delete(i)}function cm(i){let t=[];for(let e of vu)try{let n=e(i);Array.isArray(n)&&t.push(...n.filter(s=>s&&typeof s.label=="string"&&typeof s.run=="function"))}catch(n){console.warn(`${st} | a moments provider failed`,n)}return t}var en=(i,t)=>t?game.i18n.format(`STAGECRAFT.Blocking.${i}`,t):game.i18n.localize(`STAGECRAFT.Blocking.${i}`),bu={line:"Line",huddle:"Huddle",talk:"Talk",gangup:"Gangup",panel:"Panel",standoff:"Standoff",circle:"Circle",queue:"Queue",scatter:"Scatter",audience:"Audience"},Cc=class{constructor(t){this.host=t,this.armed=null,this.el=document.createElement("div"),this.el.className="stagecraft-bar stagecraft-blocking",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",en("Label")),this.el.innerHTML=`
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${Va.map(e=>`<button type="button" data-act="form" data-kind="${e}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`,t.root.append(this.el),this.el.addEventListener("click",this.#i),this.el.addEventListener("dblclick",this.#n),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#i),this.el?.removeEventListener("dblclick",this.#n),this.el?.remove(),this.el=null}get#t(){return this.host.scene}refresh(){if(!this.el)return;let t=this.#t,e=(r,a,{on:o=!1,tip:l=""}={})=>{r.textContent=a,r.title=l,r.setAttribute("aria-pressed",o?"true":"false"),r.classList.toggle("on",o)};e(this.el.querySelector('[data-act="life"]'),en("Life.Label"),{on:or(t),tip:en("Life.Tip")}),e(this.el.querySelector('[data-act="board"]'),en("Board.Label"),{on:lr(t),tip:en("Board.Tip")});for(let r of this.el.querySelectorAll('[data-act="form"]')){let a=r.dataset.kind;e(r,en(`Form.${bu[a]}.Label`),{on:this.armed===a,tip:`${en(`Form.${bu[a]}.Tip`)} ${en("Form.How")}`})}e(this.el.querySelector('[data-act="tidy"]'),en("Tidy.Label"),{tip:en("Tidy.Tip")}),e(this.el.querySelector('[data-act="places"]'),en("Places.Label"),{tip:en("Places.Tip")});let n=cm(t),s=this.el.querySelector(".moments");s.hidden=!n.length,s.innerHTML=n.map((r,a)=>`<button type="button" data-act="moment" data-i="${a}" title="${hm(r.tip??"")}">${hm(r.label)}</button>`).join(""),this.moments=n,this.#e()}#e(){let t=this.el.querySelector(".hint"),e=this.host.selected?.size??0,n=[];this.armed&&n.push(en("Armed",{name:en(`Form.${bu[this.armed]}.Label`)})),e&&n.push(en("Selected",{n:e})),t.hidden=!n.length,t.textContent=n.join(" \xB7 ")}selectionChanged(){this.el&&this.#e()}disarm(){return this.armed?(this.armed=null,this.refresh(),!0):!1}async placeArmed({card:t=null,at:e=null}){let n=this.armed;if(!n)return!1;this.disarm();let s=this.host.selected?.size?[...this.host.selected]:null,r={ids:s,focus:t??e??null};return t&&n==="gangup"&&(r.target=t),t&&n==="talk"&&(r.speakers=[t,...(s??[]).filter(a=>a!==t)]),s&&n==="talk"&&!t&&(r.speakers=s.slice(0,2)),(t||s)&&(r.party=!0),t&&s&&!s.includes(t)&&(r.ids=[...s,t]),await Aa(this.#t,n,r,this.host),!0}#i=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#s(e).catch(n=>console.warn(`${st} | the blocking strip could not do "${e.dataset.act}"`,n))};#n=t=>{let e=t.target.closest('button[data-act="form"]');if(!e)return;this.armed=null;let n=this.host.selected?.size?[...this.host.selected]:null;Aa(this.#t,e.dataset.kind,{ids:n,party:!!n},this.host).then(()=>this.refresh()).catch(s=>console.warn(`${st} | the formation could not be made`,s))};async#s(t){let e=this.#t,n=t.dataset.act;n==="life"?await Ec(e,!or(e)):n==="board"?await Ac(e,!lr(e)):n==="form"?this.armed=this.armed===t.dataset.kind?null:t.dataset.kind:n==="tidy"?await Tc(e,this.host):n==="places"?await wc(e):n==="moment"&&await this.moments?.[Number(t.dataset.i)]?.run?.(e),this.refresh()}};function hm(i){return String(i).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}var Rc=class{constructor({scene:t,skins:e,anchor:n,services:s={},onFatal:r=null}){this.scene=t,this.onFatal=r,this.guard=new Wa({limit:600,report:(a,o)=>console.error(`${st} | a frame failed (${o} in a row)`,a),onFatal:a=>this.#e(a)}),this.threeFailed=!1,this.losses=0,this.rebuilding=!1,this.saving=Promise.resolve(),this.skins=e,this.anchor=n,this.services=s,this.userId=game.user.id,this.dragging=null,this.selected=new Set,this.running=!1,this.frames=0,this.listeners=[],this.hooks=[]}async start(){let{usable:t,scene:e,problems:n}=ss(this.scene);if(!t)return console.warn(`${st} | "${this.scene.name}" has a stage description that cannot be drawn:`,n),ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable",{scene:this.scene.name})),!1;n.length&&console.warn(`${st} | "${this.scene.name}" has notes:`,n),this.description=e,this.people=fr(this.scene),this.stage=new hs(e,this.people,{card:this.skins.get(e.skin).size,clock:Sc}),this.stage.setLife(or(this.scene)),this.stage.setBoard(lr(this.scene));for(let s of this.people){let r=this.stage.cards.get(s.id);r&&(r.appliedMove=s.move?.t0??null)}for(let s of this.stage.problems)console.warn(`${st} | ${s}`);return this.sync=new Xa({stage:this.stage,scene:this.scene.id,me:this.userId,now:()=>game.time.serverTime,clock:()=>performance.now(),send:s=>this.channel?.send(s),mayHold:(s,r)=>this.#l(s,r),onLost:s=>this.#o(s),onDrop:s=>this.#c(s)}),this.channel=sm((s,r)=>this.sync.receive(s,r)),this.root=document.createElement("div"),this.root.id="stagecraft-stage",this.root.dataset.scene=this.scene.id,this.anchor.after(this.root),await this.#t(),this.chalk=this.services.chalkStore?new Mc({host:this,store:this.services.chalkStore}):null,this.chalk?.sync(),this.chalk?.refresh(),game.user.isGM&&(this.bar=new bc(this),this.blocking=new Cc(this)),this.#d(),this.#m(),this.#r(),this.#g(),this.#x(),this.running=!0,this.last=performance.now(),this.raf=requestAnimationFrame(this.#i),Hooks.callAll("stagecraft.stageReady",this),!0}async#t(){let t=new Ji,e=this.root.clientWidth||window.innerWidth,n=this.root.clientHeight||window.innerHeight,s=this.skins.get(this.description.skin),r=Hu()==="auto"&&im(),a=tm({tier:Dc(),webgl:nm(),failed:this.threeFailed,software:r});if(a==="flat"&&r&&!this.toldFlat&&(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware"))),a==="three"){let l=new _c({images:t,onContextLost:()=>this.#_()});try{l.mount(this.root,{quality:Dc(),pixelRatio:window.devicePixelRatio,width:e,height:n}),l.setCalm(Da()),l.setZoneSetting(Na()),await l.load(this.description,s,this.people),this.backend=l;return}catch(c){console.warn(`${st} | the 3D picture could not start here; drawing the plain one`,c),l.dispose(),this.threeFailed=!0}this.toldFlat||(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")))}let o=new vc({images:t});o.mount(this.root,{pixelRatio:window.devicePixelRatio,width:e,height:n}),o.setCalm(Da()),o.setZoneSetting(Na()),await o.load(this.description,s,this.people),this.backend=o}#e(t){if(this.backend?.name!=="flat"&&!this.threeFailed&&this.running){console.warn(`${st} | the 3D picture keeps failing; trying the plain one`,t),this.threeFailed=!0,this.guard.failures=0,this.rebuild().then(()=>{this.running&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.#i))}).catch(e=>{this.running=!1,this.onFatal?.(e)});return}this.running=!1,this.onFatal?.(t)}async stop(){this.running=!1,cancelAnimationFrame(this.raf);for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[];for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.resizeObserver?.disconnect(),this.sync?.close(),this.channel?.close(),this.channel=null,this.chalk?.stop(),this.bar?.dispose(),this.blocking?.dispose(),this.backend?.dispose(),this.root?.remove(),this.chalk=this.bar=this.blocking=this.backend=this.root=null}#i=t=>{if(!this.running)return;this.guard.run(()=>{let n=(t-this.last)/1e3;this.last=t,this.sync.tick(),this.stage.advance(n),this.backend.draw(this.stage.snapshot({viewer:this.userId,selected:this.selected})),this.frames++;for(let s of this.stage.drain())Hooks.callAll(`stagecraft.${s.type}`,s,this)})&&(this.raf=requestAnimationFrame(this.#i))};#n(t,e,n,s){t.addEventListener(e,n,s),this.listeners.push([t,e,n,s])}#s(t){let e=this.root.getBoundingClientRect();return{x:t.clientX-e.left,y:t.clientY-e.top}}#r(){let t=this.backend.canvas;this.#n(t,"pointerdown",n=>{if(n.button===2&&this.chalk?.inHand){this.chalk.putAway();return}if(n.button===2&&this.blocking?.disarm()||n.button!==0)return;let s=this.#s(n),r=this.backend.pick(s.x,s.y);if(this.blocking&&!this.chalk?.inHand){if(this.blocking.armed){let l=r?.kind==="card"?null:this.#a(s);if(r?.kind==="card"||l){this.blocking.placeArmed({card:r?.kind==="card"?r.id:null,at:l}).catch(c=>console.warn(`${st} | the formation could not be made`,c)),n.preventDefault();return}}if(n.shiftKey&&r?.kind==="card"){this.selected.has(r.id)?this.selected.delete(r.id):this.selected.add(r.id),this.blocking.selectionChanged(),n.preventDefault();return}}if(r?.kind==="chalk"||r?.kind==="eraser"){this.chalk?.take(r.kind==="eraser"?"rub":r.colour),this.chalk?.hover(s),n.preventDefault();return}if(this.chalk?.inHand){this.chalk.begin(s)&&(t.setPointerCapture(n.pointerId),this.chalk.hover(s),n.preventDefault());return}if(r?.kind!=="card"||!this.sync.grab(r.id))return;let a=this.backend.floorAt(s.x,s.y,r.point.y),o=this.stage.cards.get(r.id);this.dragging={id:r.id,height:r.point.y,offX:(a?.x??o.puppet.x)-o.puppet.x,offZ:(a?.z??o.Z)-o.Z},t.setPointerCapture(n.pointerId),t.style.cursor="grabbing",n.preventDefault()}),this.#n(t,"pointermove",n=>{let s=this.#s(n);if(this.chalk?.inHand){this.chalk.hover(s),t.style.cursor="none";return}if(!this.dragging){let a=this.backend.pick(s.x,s.y);t.style.cursor=a?"grab":"default";return}let r=this.backend.floorAt(s.x,s.y,this.dragging.height);r&&this.sync.move(this.dragging.id,r.x-this.dragging.offX,r.z-this.dragging.offZ)});let e=n=>{if(this.chalk?.drawing){this.chalk.end().catch(s=>console.warn(`${st} | chalk stroke failed`,s)),this.chalk.hover(this.#s(n));return}this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null,t.style.cursor="default")};this.#n(t,"pointerup",e),this.#n(t,"pointercancel",e),this.#n(window,"keydown",n=>{if(n.code==="Escape"){if(this.chalk?.inHand)this.chalk.putAway();else if(!this.blocking?.disarm())if(this.selected.size)this.selected.clear(),this.blocking?.selectionChanged();else return;n.preventDefault(),n.stopPropagation()}},!0)}#a(t){let e=this.backend.floorAt(t.x,t.y,0);if(!e)return null;let n=this.stage.rig.fractionOf(e.x,e.z);return Number.isFinite(n[0])&&Number.isFinite(n[1])?[Math.round(n[0]*1e4)/1e4,Math.round(n[1]*1e4)/1e4]:null}perform(t){this.dragging&&this.sync.verb(this.dragging.id,t)}#l(t,e){let n=this.stage.cards.get(t)?.person,s=game.users.get(e);return!!n&&!!s&&Bu(n,s,{handsOff:as(this.scene)})}#o(t){this.dragging?.id===t&&(this.dragging=null,this.backend?.canvas&&(this.backend.canvas.style.cursor="default"))}#c(t){if(!rs())return;let e=this.stage.placeOf(t.card);e&&(this.saving=Mu(()=>this.#u(e)).catch(n=>console.warn(`${st} | could not save where a card was put down`,n)))}async#u(t){let e=this.scene.flags?.[st]?.published?.cards;!Array.isArray(e)||!e.some(n=>n.id===t.id)||await this.scene.update({[`flags.${st}.published.cards`]:Ed(e,t)})}#h(){let t=fr(this.scene),e=new Set(t.map(n=>n.id));this.stage.setLife(or(this.scene)),this.stage.setBoard(lr(this.scene)),this.#d();for(let n of t){let s=this.stage.cards.get(n.id);if(s){this.#p(s,n);continue}let r=this.stage.addCard(n);r&&(r.appliedMove=n.move?.t0??null),this.people.push(n),this.backend.addCard(n).catch(a=>console.warn(`${st} | could not draw ${n.id}`,a))}for(let n of[...this.stage.cards.keys()])e.has(n)||(this.sync.forget(n),this.dragging?.id===n&&this.#o(n),this.stage.removeCard(n),this.backend.removeCard(n),this.people=this.people.filter(s=>s.id!==n))}#d(){if(!this.root)return;if(!(this.stage.board&&this.stage.zones.some(n=>n.kind==="area"))){this.keyEl?.remove(),this.keyEl=null;return}if(this.keyEl)return;let e=n=>game.i18n.localize(`STAGECRAFT.Board.${n}`);this.keyEl=document.createElement("div"),this.keyEl.className="stagecraft-board-key",this.keyEl.innerHTML=`<b>${e("Title")}</b><span><i class="engaged"></i>${e("Engaged")}</span><span><i class="near"></i>${e("Near")}</span><span><i class="far"></i>${e("Far")}</span>`,this.root.append(this.keyEl)}#p(t,e){t.person={...t.person,...e,portrait:t.person.portrait};let n=e.move;if(n&&Number.isFinite(n.t0)&&n.t0!==t.appliedMove){t.appliedMove=n.t0,this.stage.walkTo(e.id,e.mark?{mark:e.mark}:{at:e.at},{t0:n.t0,gait:n.gait??"walk",yaw:Number.isFinite(e.yaw)?e.yaw:null,lean:e.lean??0,pitch:e.pitch??0,still:e.still===!0,packed:e.packed===!0});return}t.holder===null&&(t.still=e.still===!0,t.packed=e.packed===!0)}#m(){let t=()=>{!this.backend||!this.root||this.backend.resize(this.root.clientWidth,this.root.clientHeight,window.devicePixelRatio)};this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(this.root),t()}#g(){this.hooks.push(["stagecraft.settingsChanged",Hooks.on("stagecraft.settingsChanged",t=>{t==="calm"&&this.backend?.setCalm(Da()),t==="zones"&&this.backend?.setZoneSetting(Na()),t==="tier"&&ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"))})])}#x(){this.hooks.push(["userConnected",Hooks.on("userConnected",(t,e)=>{e||this.sync?.userGone(t.id)})]),this.hooks.push(["updateScene",Hooks.on("updateScene",t=>{t.id===this.scene.id&&(this.chalk?.refresh(),this.bar?.refresh(),this.blocking?.refresh(),this.#h(),as(this.scene)&&!game.user.isGM&&this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null))})])}#_(){console.warn(`${st} | the graphics context was lost; the stage will be rebuilt`),++this.losses>=2&&(this.threeFailed=!0),this.rebuild().catch(t=>{console.error(`${st} | the stage could not be rebuilt`,t),this.onFatal?.(t)})}async rebuild(){if(!(!this.running||this.rebuilding)){this.rebuilding=!0;try{await this.#f()}finally{this.rebuilding=!1}}}async#f(){for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[],this.backend.dispose(),await this.#t(),!(!this.running||!this.backend)&&(this.chalk?.reset(),this.chalk?.sync(),this.chalk?.refresh(),this.#r())}};var Pi={host:null};function um(i,{makeHost:t=n=>new Rc(n),services:e={}}={}){let n=foundry.canvas.SceneManager;class s extends n{#t=null;#e=null;async _onDraw(){let o=canvas.app.view;this.#t=t({scene:this.scene,skins:i,anchor:o,services:e,onFatal:()=>this.#i()});let l=!1;try{this.#e={display:o.style.display},o.style.display="none",canvas.app.stop(),l=await this.#t.start()}catch(c){console.error(`${st} | could not take over "${this.scene.name}"`,c),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}))}if(l){Pi.host=this.#t;return}try{await this.#t?.stop()}catch(c){console.error(`${st} | the stage did not stop cleanly`,c)}this.#t=null,this.#n()}async _onTearDown(){Pi.host===this.#t&&(Pi.host=null),await this.#t?.stop(),this.#t=null,this.#n()}async#i(){if(!this.#t)return;let o=this.#t;this.#t=null,Pi.host===o&&(Pi.host=null),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}));try{await o.stop()}catch(l){console.error(`${st} | the stage did not stop cleanly`,l)}this.#n()}#n(){this.#e&&(canvas.app.view.style.display=this.#e.display||"block",canvas.app.start(),this.#e=null)}}let r=CONFIG.Canvas.managedScenes;return CONFIG.Canvas.managedScenes=new Proxy(r,{get(a,o,l){if(typeof o!="string")return Reflect.get(a,o,l);if(Object.hasOwn(a,o))return a[o];let c=game.scenes?.get(o);return c&&is(c)?s:void 0}}),s}var Zv="0.2.0";function dm({skins:i,current:t}){return{version:Zv,skins:{register:e=>i.register(e),use:e=>i.use(e),list:()=>i.list()},scenes:{isStage:e=>is(e),describe:e=>ss(e),validate:e=>Ia(e)},blocking:{formations:[...Va],gaits:[...xd],routines:[...Vc],move:(e,n)=>Ea(e,n),arrange:(e,n,s={})=>Aa(e,n,s,t.host),backToPlaces:e=>wc(e),tidy:e=>Tc(e,t.host),setLife:(e,n)=>Ec(e,n),setBoard:(e,n)=>Ac(e,n),registerMoments:e=>lm(e)},stage:()=>t.host?{stage:t.host.stage,backend:t.host.backend}:null,zoneKinds:[...Ou],chalkModes:[...ur]}}var qv=[{action:"hop",verb:"hop",key:"Space"},{action:"nod",verb:"nod",key:"KeyN"},{action:"bow",verb:"bow",key:"KeyB"},{action:"shake",verb:"shake",key:"KeyX"},{action:"turn",verb:"turn",key:"KeyT"}];function fm(i){for(let{action:t,verb:e,key:n}of qv)game.keybindings.register(st,t,{name:`STAGECRAFT.Keys.${t}`,editable:[{key:n}],onDown:()=>{let s=i();return s?.dragging?(s.perform(e),!0):!1},restricted:!1,precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY})}var $v="Stagecraft chalk",Yv=40,cr=class i{#t=Promise.resolve();constructor(){this.listeners=new Set,this.hooks=[];for(let t of["createJournalEntryPage","updateJournalEntryPage","deleteJournalEntryPage"])this.hooks.push([t,Hooks.on(t,e=>this.#l(e))]);for(let t of["createJournalEntry","updateJournalEntry","deleteJournalEntry"])this.hooks.push([t,Hooks.on(t,e=>this.#o(e))]);this.hooks.push(["deleteScene",Hooks.on("deleteScene",t=>this.#c(t))]);for(let t of["createScene","updateScene"])this.hooks.push([t,Hooks.on(t,()=>this.#n())])}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.listeners.clear()}get entry(){return game.journal?.find(t=>t.getFlag(st,"chalk")===!0)??null}get ready(){return!!this.entry}static wanted(){return!!game.scenes?.some(t=>is(t)&&Zl(dr(t).chalk,t.flags?.[st]?.live?.chalk).mode!=="off")}static#e=null;static ensure(){return rs()?i.#e??=i.#i().finally(()=>{i.#e=null}):Promise.resolve(null)}static async#i(){let t=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,e=game.journal.find(n=>n.getFlag(st,"chalk")===!0);return e?(e.ownership?.default??0)<t&&await e.update({"ownership.default":t}):e=await JournalEntry.create({name:$v,flags:{[st]:{chalk:!0}},ownership:{default:t}}),e}#n(){!rs()||this.ready||!i.wanted()||i.ensure().catch(t=>console.warn(`${st} | could not make the chalk journal`,t))}#s(t){return(this.entry?.pages??[]).filter(e=>e.getFlag(st,"chalk")?.scene===t)}strokes(t){return du(this.#s(t).map(e=>({strokes:e.getFlag(st,"chalk")?.strokes??[]})))}#r(t){let e=this.#t.then(t);return this.#t=e.catch(()=>{}),e}append(t,e){return this.#r(async()=>{let n=this.entry;if(!n)return!1;let s=this.#s(t).filter(a=>a.getFlag(st,"chalk")?.by===game.user.id),r=s.find(a=>(a.getFlag(st,"chalk")?.strokes?.length??0)<Yv);if(r){let a=[...r.getFlag(st,"chalk").strokes??[],e];await r.update({[`flags.${st}.chalk.strokes`]:a})}else await n.createEmbeddedDocuments("JournalEntryPage",[{name:`chalk ${t} ${game.user.name}`,type:"text",text:{content:""},flags:{[st]:{chalk:{scene:t,by:game.user.id,n:s.length,strokes:[e]}}}}]);return!0})}remove(t,e){let n=new Set(e);return this.#r(async()=>{for(let s of this.#s(t)){let r=s.getFlag(st,"chalk"),a=(r?.strokes??[]).filter(o=>!n.has(o.id));a.length===(r?.strokes??[]).length||!s.isOwner||await s.update({[`flags.${st}.chalk.strokes`]:a})}})}wipe(t,{by:e=null}={}){return game.user.isGM?this.#r(async()=>{for(let n of this.#s(t)){let s=n.getFlag(st,"chalk");e&&s?.by!==e||(s?.strokes??[]).length&&await n.update({[`flags.${st}.chalk.strokes`]:[]})}}):Promise.resolve()}strokesBy(t,e){return this.strokes(t).filter(n=>n.by===e)}onChange(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#a(t){for(let e of this.listeners)e(t)}#l(t){if(t.parent?.id!==this.entry?.id)return;let e=t.getFlag(st,"chalk")?.scene;e&&this.#a(e)}#o(t){t.getFlag(st,"chalk")===!0&&this.#a(null)}#c(t){!rs()||!t?.id||this.#r(async()=>{let e=this.#s(t.id).map(n=>n.id);e.length&&await this.entry.deleteEmbeddedDocuments("JournalEntryPage",e)}).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${st} | could not clear the chalk of a deleted scene`,e)})}};function Jv(i,t,{user:e=game.user,journal:n=game.journal}={}){if(e?.isGM||!t?.querySelectorAll)return 0;let s=n?.find(a=>a.getFlag(st,"chalk")===!0);if(!s)return 0;let r=[...t.querySelectorAll(`[data-entry-id="${s.id}"]`)];for(let a of r)a.remove();return r.length}function pm(){Hooks.on("renderJournalDirectory",(i,t)=>Jv(i,t))}var Su=new Pa,mm={chalkStore:null};Hooks.once("init",()=>{zu(),fm(()=>Pi.host),mm.chalkStore=new cr,pm(),um(Su,{services:mm}),Hooks.callAll("stagecraft.init",{registerSkin:i=>Su.register(i)})});Hooks.once("ready",async()=>{let i=game.modules.get("stagecraft");i.api=dm({skins:Su,current:Pi});try{cr.wanted()&&await cr.ensure()}catch(t){console.warn("stagecraft | could not make the chalk journal",t)}Hooks.callAll("stagecraft.ready",i.api)});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
