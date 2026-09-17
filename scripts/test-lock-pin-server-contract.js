const assert=require('assert');
const fs=require('fs');
const path=require('path');

const patch=fs.readFileSync(path.join(__dirname,'patch-booth-lock-schedule.js'),'utf8');

assert.ok(patch.includes('/api/booth-agent/control'),'Le endpoint de controle Agent doit etre gere par le patch');
assert.ok(patch.includes('control.lockScreen?.pin'),'Le PIN persiste doit etre lu depuis lockScreen');
assert.ok(patch.includes('?String(control.lockScreen.pin):"2828"'),'2828 doit rester uniquement le secours si le PIN serveur est absent/invalide');
assert.ok(patch.includes('pinConfigured:Boolean(control.lockScreen.pin)'),'La reponse Admin ne doit exposer que pinConfigured');
assert.ok(!patch.includes('console.log(control.lockScreen.pin)'), 'Le PIN ne doit jamais etre journalise');
assert.ok(!patch.includes('console.error(control.lockScreen.pin)'), 'Le PIN ne doit jamais etre journalise');

console.log('LP28 PIN serveur -> Agent: contrat valide');
