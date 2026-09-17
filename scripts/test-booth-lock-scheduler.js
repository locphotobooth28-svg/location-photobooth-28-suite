const assert=require("assert");
const {evaluateBoothLock,normalizeLockConfig,agentLockConfig,DEFAULT_PIN,normalizeSchedules}=require("../lib/boothLockScheduler");

function state(now,schedules,manualOverride=null){return evaluateBoothLock({nowISO:now,schedules,manualOverride});}
const once=[{kind:"once",startAt:"2026-09-19T19:00:00+02:00",endAt:"2026-09-20T03:00:00+02:00"}];
assert.equal(state("2026-09-19T18:00:00+02:00",once).state,"WAITING");
assert.equal(state("2026-09-19T19:00:00+02:00",once).state,"OPEN");
assert.equal(state("2026-09-20T02:59:59+02:00",once).state,"OPEN");
assert.equal(state("2026-09-20T03:00:00+02:00",once).state,"ENDED");

const twice=[
 {kind:"once",startAt:"2026-09-19T14:00:00+02:00",endAt:"2026-09-19T18:00:00+02:00"},
 {kind:"once",startAt:"2026-09-19T20:00:00+02:00",endAt:"2026-09-19T23:30:00+02:00"}
];
assert.equal(state("2026-09-19T17:00:00+02:00",twice).state,"OPEN");
assert.equal(state("2026-09-19T19:00:00+02:00",twice).state,"WAITING");
assert.ok(state("2026-09-19T19:00:00+02:00",twice).nextOpenAt.includes("20:00:00"));
assert.equal(state("2026-09-19T21:00:00+02:00",twice).state,"OPEN");
assert.equal(state("2026-09-20T00:00:00+02:00",twice).state,"ENDED");

const weekly=[{kind:"weekly",days:[6],startTime:"20:00",endTime:"03:00"}];
assert.equal(state("2026-09-19T19:00:00+02:00",weekly).state,"WAITING");
assert.equal(state("2026-09-19T21:00:00+02:00",weekly).state,"OPEN");
assert.equal(state("2026-09-20T02:30:00+02:00",weekly).state,"OPEN");
assert.equal(state("2026-09-20T03:00:00+02:00",weekly).state,"WAITING");

// Plusieurs jours récurrents : lundi + mercredi + samedi.
const multiWeekly=[{kind:"weekly",days:[1,3,6],startTime:"18:30",endTime:"23:00"}];
assert.equal(state("2026-09-21T18:29:59+02:00",multiWeekly).state,"WAITING");
assert.equal(state("2026-09-21T18:30:00+02:00",multiWeekly).state,"OPEN");
assert.equal(state("2026-09-22T19:00:00+02:00",multiWeekly).state,"WAITING");
assert.equal(state("2026-09-23T19:00:00+02:00",multiWeekly).state,"OPEN");

// Mélange ponctuel + hebdomadaire : le prochain créneau doit être le plus proche.
const mixed=[
 {kind:"weekly",days:[6],startTime:"20:00",endTime:"23:00"},
 {kind:"once",startAt:"2026-09-18T19:00:00+02:00",endAt:"2026-09-18T22:00:00+02:00"}
];
const mixedWaiting=state("2026-09-18T18:00:00+02:00",mixed);
assert.equal(mixedWaiting.state,"WAITING");
assert.ok(mixedWaiting.nextOpenAt.includes("2026-09-18T19:00:00"));

// Normalisation : doublons de jours supprimés, jours invalides ignorés, max 30 créneaux.
const normalizedWeekly=normalizeSchedules([{kind:"weekly",days:[6,6,0,8,1],startTime:"20:00",endTime:"03:00"}]);
assert.deepEqual(normalizedWeekly[0].days,[1,6]);
const tooMany=Array.from({length:35},(_,i)=>({kind:"once",id:String(i),startAt:`2026-10-${String((i%28)+1).padStart(2,"0")}T10:00:00+02:00`,endAt:`2026-10-${String((i%28)+1).padStart(2,"0")}T11:00:00+02:00`}));
assert.equal(normalizeSchedules(tooMany).length,30);

assert.equal(state("2026-09-19T12:00:00+02:00",once,"LOCK").state,"MANUAL_LOCK");
assert.equal(state("2026-09-19T12:00:00+02:00",once,"UNLOCK").state,"MANUAL_UNLOCK");
assert.equal(state("2026-09-19T12:00:00+02:00",[]).state,"OPEN");

// PIN : 2828 n'est qu'un secours initial. Dès qu'Admin enregistre un PIN,
// le serveur le conserve et l'Agent reçoit exactement cette valeur.
const initial=normalizeLockConfig({},{});
assert.equal(initial.pin,DEFAULT_PIN);
const changed=normalizeLockConfig({pin:"4587"},initial);
assert.equal(changed.pin,"4587");
assert.equal(agentLockConfig(changed).pin,"4587");
const unchanged=normalizeLockConfig({},changed);
assert.equal(unchanged.pin,"4587");
assert.throws(()=>normalizeLockConfig({pin:"28"},changed),/4 chiffres/);
assert.throws(()=>normalizeLockConfig({pin:"abcd"},changed),/4 chiffres/);
assert.notEqual(agentLockConfig(changed).pin,DEFAULT_PIN);

console.log("LP28 lock scheduler + créneaux multiples/récurrents + synchronisation PIN: toutes les simulations sont OK");
