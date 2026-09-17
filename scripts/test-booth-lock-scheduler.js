const assert=require("assert");
const {evaluateBoothLock}=require("../lib/boothLockScheduler");

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

assert.equal(state("2026-09-19T12:00:00+02:00",once,"LOCK").state,"MANUAL_LOCK");
assert.equal(state("2026-09-19T12:00:00+02:00",once,"UNLOCK").state,"MANUAL_UNLOCK");
assert.equal(state("2026-09-19T12:00:00+02:00",[]).state,"OPEN");
console.log("LP28 lock scheduler: toutes les simulations sont OK");
