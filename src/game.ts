export type Resource = 'oxygen'|'water'|'food'|'power';
export type Building = 'habitat'|'solar'|'greenhouse'|'oxygen'|'comms';
export type EventKind = 'storm'|'failure'|'radiation'|'delay';
export interface State { day:number; resources:Record<Resource,number>; levels:Record<Building,number>; health:number; status:'ready'|'playing'|'won'|'lost'; event:EventKind|null; weather:number; messageDue:number|null; action:string; log:string[]; serial:number }
export const buildings:Record<Building,{name:string;hint:string;science:string;cost:number;resource:Resource}>={
 habitat:{name:'Crew habitat',hint:'Add radiation shielding',science:'Thick shielding reduces radiation exposure. Building it takes water and crew time.',cost:18,resource:'water'},
 solar:{name:'Solar field',hint:'Add panels and battery storage',science:'Solar panels turn sunlight into electricity. Batteries store energy for darkness and dusty days.',cost:14,resource:'water'},
 greenhouse:{name:'Greenhouse',hint:'Plant another growing bed',science:'Growing food takes water and light. Recycling water keeps more supplies in the colony.',cost:18,resource:'power'},
 oxygen:{name:'Life-support lab',hint:'Improve oxygen and water recovery',science:'Life-support equipment makes breathable oxygen and recovers water. It needs electricity to work.',cost:18,resource:'power'},
 comms:{name:'Communication station',hint:'Upgrade the Earth link',science:'Radio signals travel at the speed of light. Earth cannot answer a Mars crew instantly.',cost:12,resource:'power'}
};
export const events:Record<EventKind,{title:string;body:string;science:string;choices:[string,string];costs:[string,string]}>={
 storm:{title:'Dust on the horizon!',body:'Dust will block sunlight for three days. How will you prepare?',science:'Dust in the atmosphere reduces sunlight reaching solar panels. Energy storage helps keep life support running.',choices:['Clean panels & use reserves','Run essential systems only'],costs:['−12 water · shorter storm','−5 food · save 16 energy']},
 failure:{title:'A pipe needs a patch',body:'The life-support lab has a leak. Your crew is ready to help.',science:'Spacecraft recycle supplies, but pumps and pipes still need maintenance. Repairs use limited resources.',choices:['Repair the water loop','Isolate the leaking pipe'],costs:['−14 energy · +8 water','−12 water · +4 oxygen']},
 radiation:{title:'Time for a sun shelter',body:'A practice solar-particle alert has arrived. Protect the crew before continuing.',science:'Solar energetic particles can harm astronauts. Shielding reduces exposure. This scenario is illustrative, not a live NASA alert.',choices:['Shelter and pause the harvest','Prepare a shielded work area'],costs:['−8 food · crew protected','−18 energy · crew protected']},
 delay:{title:'Earth is a little far away',body:'Your supply request cannot arrive immediately. Pick a plan for the wait.',science:'Communication delay depends on the distance between Earth and Mars. Supply deliveries take much longer than radio messages; our delivery wait is compressed game time.',choices:['Send a supply request','Make supplies locally'],costs:['−8 energy · +24 water in 3 days','−10 energy · +10 water now']}
};
export function initial():State{return {day:1,resources:{oxygen:82,water:78,food:76,power:70},levels:{habitat:1,solar:1,greenhouse:1,oxygen:1,comms:1},health:100,status:'ready',event:null,weather:0,messageDue:null,action:'Welcome to Pathfinder. Your crew is ready.',log:[],serial:0};}
export function rates(s:State):Record<Resource,number>{return {oxygen: s.resources.power>0? s.levels.oxygen*4-5:-12,water:s.resources.power>0?s.levels.oxygen*3-5:-8,food:s.resources.power>0?s.levels.greenhouse*4-7:-8,power:Math.round(s.levels.solar*13*(s.weather>0?0.35:1))-s.levels.oxygen*3-s.levels.greenhouse*3-5};}
export type Action={type:'start'|'restart'|'next'}|{type:'upgrade';building:Building}|{type:'choice';choice:0|1};
export function reducer(state:State,a:Action):State{
 if(a.type==='restart')return {...initial(),status:'playing'};
 if(a.type==='start')return {...state,status:'playing',action:'Tap a building to help your crew. Keep everyone safe for 30 days.'};
 if(state.status!=='playing'||(state.event&&a.type!=='choice'))return state;
 const s:State={...state,resources:{...state.resources},levels:{...state.levels},log:[...state.log],serial:state.serial+1};
 if(a.type==='upgrade'){const b=buildings[a.building];if(s.levels[a.building]>=3||s.resources[b.resource]<b.cost)return state;s.resources[b.resource]-=b.cost;s.levels[a.building]++;s.action=`${b.name} upgraded! ${b.resource} −${b.cost}. New equipment is online.`;}
 if(a.type==='next'){
 const r=rates(s);for(const k of Object.keys(r) as Resource[])s.resources[k]=Math.max(0,Math.min(100,s.resources[k]+r[k]));s.day++;s.weather=Math.max(0,s.weather-1);
 const critical=s.resources.oxygen===0||s.resources.water===0||s.resources.food===0||s.resources.power===0;s.health=Math.max(0,Math.min(100,s.health+(critical?-35:3)));
 s.action=`Day ${s.day}: ${critical?'Critical supplies! Restore life support quickly.':'Your crew completed another Mars day.'}`;
 if(s.messageDue&&s.day>=s.messageDue){s.resources.water=Math.min(100,s.resources.water+24);s.messageDue=null;s.action='Your delayed supply delivery arrived! Water +24.';}
 if(s.health===0){s.status='lost';s.action='Life support failed. Try a new plan: improve your lab, greenhouse and solar field early.';}
 else if(s.day>=30){s.status='won';s.action='Thirty days on Mars! Your crew built a safe home together.';}
 else if([3,11,21].includes(s.day))s.event='storm';else if([6,16,25].includes(s.day))s.event='failure';else if([9,19,28].includes(s.day))s.event='radiation';else if([13,23].includes(s.day))s.event='delay';
 }
 if(a.type==='choice'&&s.event){const kind=s.event,c=a.choice;
 const needed=kind==='storm'?(c===0?['water',12]:['food',5]):kind==='failure'?(c===0?['power',14]:['water',12]):kind==='radiation'?(c===0?['food',8]:['power',18]):['power',c===0?8:10];
 if(s.resources[needed[0] as Resource]<Number(needed[1])){s.health=Math.max(0,s.health-20);s.action='Emergency reserves covered the shortfall. Crew safety −20. Rebuild your supplies.';}else{s.resources[needed[0] as Resource]-=Number(needed[1]);s.action=events[kind].choices[c]+'. '+events[kind].costs[c]+'.';}
 if(kind==='storm'){s.weather=c===0?1:3;if(c===1)s.resources.power=Math.min(100,s.resources.power+16);}
 if(kind==='failure')s.resources[c===0?'water':'oxygen']=Math.min(100,s.resources[c===0?'water':'oxygen']+(c===0?8:4));
 if(kind==='radiation'&&s.levels.habitat>1){s.resources.food=Math.min(100,s.resources.food+4*(s.levels.habitat-1));s.action+=` Your shielding saved ${4*(s.levels.habitat-1)} food points.`;}
 if(kind==='delay'){if(c===0)s.messageDue=s.day+Math.max(1,4-s.levels.comms);else s.resources.water=Math.min(100,s.resources.water+10);}
 if(kind==='delay'&&c===0)s.action+=` Delivery due on day ${s.messageDue}.`;
 s.event=null;if(!s.health)s.status='lost';
 }
 s.log=[s.action,...s.log].slice(0,8);return s;
}
