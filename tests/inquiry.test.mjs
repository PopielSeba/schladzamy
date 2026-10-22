import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiry } from '../public/app.js';

test('rental inquiry preserves the chosen air conditioner, dates, location and quantity', () => {
  const inquiry = buildInquiry({
    service: 'rental',
    model: 'lennox-bah-085',
    location: '  Wrocław,   Polska  ',
    quantity: '2',
    start: '2026-11-03',
    duration: '1–2 tygodnie',
  });
  assert.equal(inquiry.subject, 'Wynajem klimatyzacji — Lennox BAH 085 — Wrocław, Polska');
  assert.match(inquiry.body, /Model: Lennox BAH 085/);
  assert.match(inquiry.body, /Lokalizacja realizacji: Wrocław, Polska/);
  assert.match(inquiry.body, /Wstępna liczba urządzeń: 2/);
  assert.match(inquiry.body, /Planowany początek wynajmu: 03\.11\.2026/);
  assert.match(inquiry.body, /Planowany okres wynajmu: 1–2 tygodnie/);
});

test('sale inquiry includes cooling requirements but excludes stale rental dates', () => {
  const inquiry = buildInquiry({
    service: 'sale',
    model: 'carrier-fc93',
    location: 'Opole',
    quantity: 1,
    start: '2026-11-03',
    duration: 'Kilka dni',
    targetTemperature: '22',
    powerSupply: '400 V / 3 fazy — do potwierdzenia',
  });
  assert.equal(inquiry.subject, 'Zakup klimatyzacji — Carrier FC93 — Opole');
  assert.match(inquiry.body, /ofertę zakupu klimatyzacji/);
  assert.match(inquiry.body, /Oczekiwana temperatura: 22°C/);
  assert.match(inquiry.body, /Dostępne zasilanie: 400 V \/ 3 fazy — do potwierdzenia/);
  assert.doesNotMatch(inquiry.body, /Planowany początek wynajmu|Planowany okres wynajmu|03\.11\.2026|Kilka dni/);
});

test('user details and multiline notes survive without introducing subject line breaks', () => {
  const inquiry = buildInquiry({
    location: 'Łódź\r\nhala A',
    model: 'Urządzenie\r\nz zapytania',
    quantity: 3,
    application: 'Hala namiotowa',
    dimensions: '  20 × 30 × 5 m  ',
    targetTemperature: '  21–23°C   w strefie gości  ',
    powerSupply: ' Do\nustalenia ',
    message: 'Wydarzenie na 300 osób.\r\nPraca: 10:00–18:00.\rProszę o kontakt.',
  });
  assert.match(inquiry.subject, /Łódź hala A$/);
  assert.doesNotMatch(inquiry.subject, /[\r\n]/);
  assert.match(inquiry.body, /Zastosowanie: Hala namiotowa/);
  assert.match(inquiry.body, /Obiekt \/ wymiary: 20 × 30 × 5 m/);
  assert.match(inquiry.subject, /Urządzenie z zapytania/);
  assert.match(inquiry.body, /Oczekiwana temperatura: 21–23°C w strefie gości/);
  assert.match(inquiry.body, /Dostępne zasilanie: Do ustalenia/);
  assert.ok(inquiry.body.includes('Wydarzenie na 300 osób.\nPraca: 10:00–18:00.\nProszę o kontakt.'));
  assert.doesNotMatch(inquiry.body, /\r/);
});

test('unspecified equipment requests selection instead of assuming a model', () => {
  const inquiry = buildInquiry({ location: 'Poznań' });
  assert.equal(inquiry.subject, 'Wynajem klimatyzacji — Poznań');
  assert.match(inquiry.body, /Model \/ konfiguracja: proszę o dobór\./);
  assert.match(inquiry.body, /Wstępna liczba urządzeń: 1/);
  assert.match(inquiry.body, /Planowany początek wynajmu: do uzgodnienia/);
  assert.match(inquiry.body, /Planowany okres wynajmu: do uzgodnienia/);
  assert.doesNotMatch(inquiry.body, /\bundefined\b|\bnull\b/);
  assert.doesNotMatch(inquiry.body, /Oczekiwana temperatura:|Dostępne zasilanie:|MASTER|nagrzewnic/i);
  assert.match(buildInquiry({ location: 'Poznań', quantity: 99 }).body, /Wstępna liczba urządzeń: 99/);
});

test('all catalog slugs and human-readable model names produce the expected model', () => {
  for (const [input, expected] of [
    ['lennox-bah-085', 'Lennox BAH 085'],
    ['  LENNOX BAH 085  ', 'Lennox BAH 085'],
    ['carrier-fc93', 'Carrier FC93'],
    ['dantherm-ac-m18', 'Dantherm AC-M18'],
    ['Dantherm AC-M18', 'Dantherm AC-M18'],
  ]) {
    const inquiry = buildInquiry({ location: 'Warszawa', model: input });
    assert.ok(inquiry.body.includes(`Model: ${expected}`));
    assert.ok(inquiry.subject.includes(expected));
  }
});

test('numeric temperatures retain their value and receive a Celsius unit once', () => {
  for (const [input, expected] of [[0, '0°C'], ['22,5', '22,5°C'], ['21°C', '21°C']]) {
    const inquiry = buildInquiry({ location: 'Gdańsk', targetTemperature: input });
    assert.ok(inquiry.body.includes(`Oczekiwana temperatura: ${expected}\n`));
    assert.doesNotMatch(inquiry.body, /°C°C/);
  }
});

test('empty and whitespace-only locations cannot produce an inquiry', () => {
  for (const location of [undefined, null, '', '   ', '\n\t']) {
    assert.throws(() => buildInquiry({ location }), TypeError);
  }
});

test('invalid quantities are rejected instead of sending an unusable request', () => {
  for (const quantity of [0, -1, 100, 1.5, 'abc', '', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => buildInquiry({ location: 'Wrocław', quantity }), RangeError);
  }
});
