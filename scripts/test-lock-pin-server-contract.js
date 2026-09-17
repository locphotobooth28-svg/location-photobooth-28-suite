const assert=require('assert');
const fs=require('fs');
const path=require('path');

const basePatch=fs.readFileSync(path.join(__dirname,'patch-booth-lock-schedule.js'),'utf8');
const runtimePatch=fs.readFileSync(path.join(__dirname,'patch-lock-sync-runtime.js'),'utf8');

assert.ok(basePatch.includes('/api/booth-agent/control'),'Le endpoint de controle Agent doit etre gere par le patch');
assert.ok(basePatch.includes('control.lockScreen?.pin'),'Le PIN persiste doit etre lu depuis lockScreen');
assert.ok(basePatch.includes('?String(control.lockScreen.pin):"2828"'),'2828 doit rester uniquement le secours si le PIN serveur est absent/invalide');
assert.ok(basePatch.includes('pinConfigured:Boolean(control.lockScreen.pin)'),'La reponse Admin ne doit exposer que pinConfigured');
assert.ok(!basePatch.includes('console.log(control.lockScreen.pin)'), 'Le PIN ne doit jamais etre journalise');
assert.ok(!basePatch.includes('console.error(control.lockScreen.pin)'), 'Le PIN ne doit jamais etre journalise');

// V3 exige une preuve de synchronisation Agent, distincte du simple enregistrement Admin.
assert.ok(runtimePatch.includes('pinRevision'),'Le contrat V3 doit versionner les changements de PIN');
assert.ok(runtimePatch.includes('PIN_UPDATED'),'Le changement de PIN doit etre historise sans sa valeur');
assert.ok(runtimePatch.includes('PIN_SYNC_CONFIRMED'),'La synchronisation PIN doit etre confirmee par l Agent');
assert.ok(runtimePatch.includes('pinSyncedRevision'),'Le serveur doit conserver la revision effectivement confirmee');
assert.ok(runtimePatch.includes('Révision PIN obsolète'),'Un ACK portant une ancienne revision doit etre refuse');
assert.ok(!runtimePatch.includes('details:{pin:'),'Le PIN brut ne doit jamais entrer dans l historique');

console.log('LP28 PIN V3: versionnement + ACK Agent requis');
