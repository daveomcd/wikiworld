import { events, regions } from './data/history.js';
export const MIN_YEAR = -1000;
export const MAX_YEAR = 1900;
export const formatYear = year => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;
export const formatRange = event => `${event.approximate ? 'c. ' : ''}${formatYear(event.start)} – ${formatYear(event.end)}`;
export const eventsAt = (year, region) => events.filter(event => (!region || event.region === region) && event.start <= year && event.end >= year);
export const regionById = id => regions.find(region => region.id === id);
export function validYear(year) { return Number.isInteger(year) && year !== 0 && year >= MIN_YEAR && year <= MAX_YEAR; }
export function moveYear(year, step) {
  // Convert to a continuous axis so 1 BCE and 1 CE are adjacent.
  const index = year < 0 ? year : year - 1;
  const moved = index + step;
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, moved < 0 ? moved : moved + 1));
}
export function parseState(search) {
  const params = new URLSearchParams(search);
  const year = Number(params.get('year'));
  return {
    year: validYear(year) ? year : -330,
    region: regionById(params.get('region'))?.id || 'north-america',
    compare: [...new Set((params.get('compare') || '').split(',').filter(id => regionById(id)))].slice(0, 3),
  };
}
