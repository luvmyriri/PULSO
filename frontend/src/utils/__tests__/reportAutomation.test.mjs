import assert from 'node:assert/strict';
import {test} from 'node:test';
import {hasReportLocation, locationEvidence} from '../reportIntake.js';
import {validateLocation, validateContact} from '../reportWizardValidation.js';

const fix = {latitude:14.7565, longitude:121.045, accuracy_m:55, measured_at:'2026-11-13T01:00:00.000Z'};
const gps = {lat:fix.latitude,lng:fix.longitude,accuracy:55,source:'device-gps',
  deviceFix:fix,isInCaloocan:true,confirmed:false,pinConfirmed:false,address:''};

test('an acquired GPS estimate needs no declaration, precise accuracy or address-provider response', () => {
  assert.equal(hasReportLocation(gps),true);
  assert.equal(validateLocation(gps).valid,true);
  assert.equal(locationEvidence(gps).source,'device');
  assert.equal(locationEvidence(gps).issue_pin_confirmed,false);
  assert.equal(locationEvidence(gps).confirmed_at,null);
  assert.equal(locationEvidence(gps).device_fix.accuracy_m,55);
});

test('a map display center or invalid/missing coordinates cannot become an acquired location', () => {
  for(const missing of [null,{}, {lat:14.7565,lng:121.045}, {...gps,lat:null}, {...gps,lng:999}]) {
    assert.equal(hasReportLocation(missing),false);
    assert.equal(validateLocation(missing).valid,false);
  }
  assert.equal(validateLocation({...gps,isInCaloocan:false}).valid,false);
});

test('an optional manual correction retains its separate source and sensor uncertainty', () => {
  const moved={...gps,lat:14.7566,source:'selected-map',confirmed:true,pinConfirmed:true,confirmedAt:'2026-11-13T01:01:00Z'};
  assert.equal(hasReportLocation(moved),true);
  const evidence=locationEvidence(moved);
  assert.equal(evidence.source,'manual');
  assert.deepEqual(evidence.device_fix,fix);
  assert.equal(evidence.issue_pin_confirmed,true);
});

test('contact checks are automatic and do not depend on a checkbox', () => {
  const contact={name:'Sample Resident',email:'resident@example.com',consentAccepted:false};
  assert.equal(validateContact(contact).valid,true);
  assert.equal(validateContact({...contact,email:''}).valid,false);
  assert.equal(validateContact({...contact,website_hp:'bot'}).valid,false);
});
