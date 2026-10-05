import test from 'node:test';
import assert from 'node:assert/strict';
import { events, sources, regions, presets } from '../src/data/history.js';
import { eventsAt, formatYear, moveYear, parseState, validYear } from '../src/history-utils.js';

test('historical dating crosses BCE/CE without inventing year zero', () => {
  assert.equal(moveYear(-1, 1), 1);
  assert.equal(moveYear(1, -1), -1);
  assert.equal(moveYear(-10, 10), 1);
  assert.equal(moveYear(10, -10), -1);
  assert.equal(moveYear(1899, 100), 1900);
  assert.equal(moveYear(-999, -100), -1000);
  assert.equal(formatYear(-330), '330 BCE');
  assert.equal(validYear(0), false);
  assert.equal(validYear(1.5), false);
});

test('every historical entry has valid chronology, a known region and supporting sources', () => {
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
  for (const e of events) {
    assert.ok(Number.isInteger(e.start) && Number.isInteger(e.end), e.id);
    assert.ok(e.start !== 0 && e.end !== 0 && e.start <= e.end, e.id);
    assert.ok(regions.some(r => r.id === e.region), e.id);
    assert.ok(e.summary && e.detail && e.culture && e.title, e.id);
    assert.ok(['documented', 'archaeology', 'mixed'].includes(e.type), e.id);
    assert.ok(e.sources.length, e.id);
    e.sources.forEach(key => { assert.ok(sources[key]?.title && sources[key]?.publisher, `${e.id}: ${key}`); assert.equal(new URL(sources[key].url).protocol, 'https:'); });
  }
});

test('both requested comparisons use contemporaneous entries', () => {
  assert.ok(eventsAt(-330, 'europe').some(e => e.id === 'alexander'));
  assert.ok(eventsAt(-330, 'north-america').some(e => e.id === 'adena'));
  assert.ok(!eventsAt(-330, 'north-america').some(e => e.id === 'hopewell'));
  assert.ok(eventsAt(1812, 'europe').some(e => e.id === 'napoleonic'));
  assert.ok(eventsAt(1812, 'japan').some(e => e.id === 'edo'));
  for (const p of presets) { assert.ok(eventsAt(p.year, p.region).length, p.id); assert.ok(eventsAt(p.year, p.reference).length, p.id); }
});

test('date-range endpoints are inclusive and gaps remain gaps', () => {
  assert.ok(eventsAt(-334, 'europe').some(e => e.id === 'alexander'));
  assert.ok(eventsAt(-323, 'europe').some(e => e.id === 'alexander'));
  assert.ok(!eventsAt(-322, 'europe').some(e => e.id === 'alexander'));
  assert.deepEqual(eventsAt(600, 'andes'), events.filter(e => e.region === 'andes' && e.start <= 600 && e.end >= 600));
  assert.equal(eventsAt(1900, 'mesoamerica').length, 0);
});

test('shared URLs reject invalid state and limit comparison to three unique regions', () => {
  assert.equal(parseState('?year=0&region=bad').year, -330);
  assert.equal(parseState('?year=-5000').year, -330);
  assert.equal(parseState('?year=1812&region=japan').region, 'japan');
  assert.deepEqual(parseState('?compare=europe,japan,japan,invalid,china,africa').compare, ['europe', 'japan', 'china']);
});
