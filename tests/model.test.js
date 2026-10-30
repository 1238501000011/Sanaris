import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,validateSettings,defaults,sample,history,reference,migrateSettings} from '../src/lib/model.js';
test('threshold boundaries are consistent',()=>{assert.equal(classify(39.9),'Low');assert.equal(classify(40),'Moderate');assert.equal(classify(45),'High');assert.equal(classify(70,{moderate:60,high:80}),'Moderate');});
test('reject invalid assessment settings',()=>{assert.ok(validateSettings(defaults));for(const s of [{moderate:70,high:55,interval:5},{moderate:55,high:55,interval:5},{moderate:29,high:70,interval:5},{moderate:55,high:121,interval:5},{moderate:55,high:70,interval:0}])assert.equal(validateSettings(s),false);});
test('four finite simulated readings and chronological history',()=>{const data=sample();assert.equal(data.length,4);assert.equal(new Set(data.map(n=>n.id)).size,4);assert.ok(data.every(n=>Number.isFinite(n.db)));const h=history();assert.equal(h.length,60);assert.ok(h.every((r,i)=>!i||r.timestamp>h[i-1].timestamp));});
test('complaint references are distinct and well formed',()=>{const ids=Array.from({length:1000},reference);assert.equal(new Set(ids).size,1000);assert.match(ids[0],/^SAN-\d{4}-[A-F0-9]{12}$/);});

test('45 dBA disturbance boundary and saved-settings migration', () => {
 assert.equal(classify(44.9), 'Moderate');
 assert.equal(classify(45), 'High');
 assert.equal(classify(45.1), 'High');
 assert.deepEqual(migrateSettings({ moderate: 55, high: 70, interval: 10 }), { ...defaults, interval: 10 });
 const custom = { moderate: 38, high: 46, interval: 2, version: 2 };
 assert.deepEqual(migrateSettings(custom), custom);
 assert.deepEqual(migrateSettings(null), defaults);
});
