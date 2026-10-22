const EMAIL = 'dystrybucja@halenamiotowe.com.pl';
const MODEL_ALIASES = [
  [/^lennox[\s_-]*bah[\s_-]*085$/i, 'Lennox BAH 085'],
  [/^carrier[\s_-]*fc[\s_-]*93$/i, 'Carrier FC93'],
  [/^dantherm[\s_-]*ac[\s_-]*m[\s_-]*18$/i, 'Dantherm AC-M18'],
];
const SERVICE_ALIASES = new Map([
  ['rental', 'rental'],
  ['wynajem', 'rental'],
  ['sale', 'sale'],
  ['zakup', 'sale'],
]);

const singleLine = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

function modelName(value) {
  const model = singleLine(value);
  return MODEL_ALIASES.find(([pattern]) => pattern.test(model))?.[1] || model;
}

function displayDate(value) {
  const date = singleLine(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : date;
}

export function buildInquiry(data = {}) {
  const service = data.service === 'sale' ? 'sale' : 'rental';
  const location = singleLine(data.location);
  const quantity = Number(data.quantity ?? 1);

  if (!location) throw new TypeError('Podaj lokalizację realizacji.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new RangeError('Podaj liczbę urządzeń od 1 do 99.');
  }

  const model = modelName(data.model);
  const application = singleLine(data.application);
  const dimensions = singleLine(data.dimensions);
  const rawTemperature = singleLine(data.targetTemperature);
  const targetTemperature = /^[+-]?\d+(?:[.,]\d+)?$/.test(rawTemperature)
    ? `${rawTemperature}°C`
    : rawTemperature;
  const powerSupply = singleLine(data.powerSupply);
  const message = String(data.message ?? '').replace(/\r\n?/g, '\n').trim();
  const lines = [
    'Dzień dobry,',
    '',
    service === 'sale'
      ? 'proszę o ofertę zakupu klimatyzacji.'
      : 'proszę o ofertę wynajmu klimatyzacji.',
    '',
    model ? `Model: ${model}` : 'Model / konfiguracja: proszę o dobór.',
    `Lokalizacja realizacji: ${location}`,
    `Wstępna liczba urządzeń: ${quantity}`,
  ];

  if (application) lines.push(`Zastosowanie: ${application}`);
  if (service === 'rental') {
    lines.push(
      `Planowany początek wynajmu: ${displayDate(data.start) || 'do uzgodnienia'}`,
      `Planowany okres wynajmu: ${singleLine(data.duration) || 'do uzgodnienia'}`,
    );
  }
  if (dimensions) lines.push(`Obiekt / wymiary: ${dimensions}`);
  if (targetTemperature) lines.push(`Oczekiwana temperatura: ${targetTemperature}`);
  if (powerSupply) lines.push(`Dostępne zasilanie: ${powerSupply}`);
  if (message) lines.push('', 'Informacje dodatkowe:', message);
  lines.push(
    '',
    'Proszę o potwierdzenie dostępności, warunków oferty i możliwości dostawy.',
    '',
    'Dziękuję.',
  );

  return {
    subject: `${service === 'sale' ? 'Zakup' : 'Wynajem'} klimatyzacji${model ? ` — ${model}` : ''} — ${location}`,
    body: lines.join('\n'),
  };
}

function scrollToElement(element) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const navigation = document.getElementById('site-nav');
  if (!toggle || !navigation) return;

  const setOpen = (open) => {
    navigation.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
  };

  setOpen(toggle.getAttribute('aria-expanded') === 'true');
  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  navigation.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (
      event.key !== 'Escape'
      || toggle.getAttribute('aria-expanded') !== 'true'
      || document.querySelector('dialog[open]')
    ) return;
    setOpen(false);
    toggle.focus();
  });
}

function initInquiry() {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const result = document.getElementById('inquiry-result');
  const inquiryText = document.getElementById('inquiry-text');
  const emailLink = document.getElementById('inquiry-email');
  const copyButton = document.getElementById('copy-inquiry');
  const copyStatus = document.getElementById('copy-status');
  const locationField = form.elements.namedItem('location');
  const quantityField = form.elements.namedItem('quantity');
  const startField = form.elements.namedItem('start');
  const modelField = form.elements.namedItem('model');
  const serviceFields = [...form.querySelectorAll('input[name="service"]')];
  const parameters = new URLSearchParams(window.location.search);
  let selectedModel = '';

  if (!result || !inquiryText || !emailLink || !locationField || !quantityField) return;

  locationField.required = true;
  quantityField.required = true;
  quantityField.min = '1';
  quantityField.max = '99';
  quantityField.step = '1';
  if (!quantityField.value) quantityField.value = '1';
  inquiryText.readOnly = true;
  result.tabIndex = -1;
  if (copyButton) copyButton.type = 'button';
  if (copyStatus) copyStatus.setAttribute('aria-live', 'polite');

  const currentService = () => form.querySelector('input[name="service"]:checked')?.value === 'sale'
    ? 'sale'
    : 'rental';

  const updateDateMinimum = () => {
    if (!startField) return;
    const today = new Date();
    startField.min = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    startField.required = false;
  };

  const hideResult = () => {
    result.hidden = true;
    if (copyStatus) copyStatus.textContent = '';
  };

  const syncService = () => {
    const sale = currentService() === 'sale';
    form.querySelectorAll('[data-rental-only]').forEach((wrapper) => {
      wrapper.hidden = sale;
      wrapper.querySelectorAll('input, select, textarea').forEach((control) => {
        control.disabled = sale;
      });
    });
    updateDateMinimum();
    hideResult();
  };

  const chooseService = (service) => {
    const selected = serviceFields.find((field) => field.value === service);
    if (!selected) return;
    selected.checked = true;
    syncService();
  };

  const validateFields = () => {
    locationField.setCustomValidity(
      locationField.value.trim() ? '' : 'Podaj miejscowość lub adres realizacji.',
    );
    const quantity = Number(quantityField.value);
    quantityField.setCustomValidity(
      Number.isInteger(quantity) && quantity >= 1 && quantity <= 99
        ? ''
        : 'Podaj liczbę urządzeń od 1 do 99.',
    );
  };

  const selectedLabel = (name) => {
    const field = form.elements.namedItem(name);
    return field?.value ? singleLine(field.selectedOptions?.[0]?.textContent || field.value) : '';
  };

  const chooseModel = (value) => {
    selectedModel = modelName(value);
    if (!modelField) return;
    if (modelField.options) {
      const option = [...modelField.options].find((item) => (
        modelName(item.value) === selectedModel
        || modelName(item.textContent) === selectedModel
      ));
      modelField.value = option?.value || '';
    } else modelField.value = selectedModel;
  };

  if (parameters.has('model')) chooseModel(parameters.get('model'));
  const requestedService = SERVICE_ALIASES.get(parameters.get('oferta'));
  if (requestedService) chooseService(requestedService);
  else syncService();
  serviceFields.forEach((field) => field.addEventListener('change', syncService));
  form.addEventListener('input', () => {
    validateFields();
    hideResult();
  });
  form.addEventListener('change', hideResult);
  form.addEventListener('focusin', updateDateMinimum);

  document.querySelectorAll('[data-service-choice]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = trigger.getAttribute('href');
      const target = href ? new URL(href, document.baseURI) : null;
      if (target && (
        target.origin !== window.location.origin
        || target.pathname.replace(/\/$/, '') !== window.location.pathname.replace(/\/$/, '')
      )) return;

      const service = SERVICE_ALIASES.get(trigger.dataset.serviceChoice)
        || SERVICE_ALIASES.get(target?.searchParams.get('oferta'));
      if (!service) return;
      event.preventDefault();
      if (target?.searchParams.has('model')) chooseModel(target.searchParams.get('model'));
      chooseService(service);
      if (target) window.history.replaceState(window.history.state, '', target);
      form.querySelector('input[name="service"]:checked')?.focus({ preventScroll: true });
      scrollToElement(form);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateDateMinimum();
    validateFields();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const inquiry = buildInquiry({
      service: currentService(),
      model: modelField ? data.get('model') : selectedModel,
      location: data.get('location'),
      application: selectedLabel('application'),
      quantity: data.get('quantity'),
      start: data.get('start'),
      duration: selectedLabel('duration'),
      dimensions: data.get('dimensions'),
      targetTemperature: data.get('targetTemperature'),
      powerSupply: selectedLabel('powerSupply'),
      message: data.get('message'),
    });

    inquiryText.value = inquiry.body;
    emailLink.href = `mailto:${EMAIL}?subject=${encodeURIComponent(inquiry.subject)}&body=${encodeURIComponent(inquiry.body.replace(/\n/g, '\r\n'))}`;
    const heading = result.querySelector('h2, h3, [data-inquiry-heading]');
    if (heading) heading.textContent = 'Zapytanie jest gotowe';
    if (copyStatus) copyStatus.textContent = '';
    result.hidden = false;
    result.focus({ preventScroll: true });
    scrollToElement(result);
  });

  copyButton?.addEventListener('click', async () => {
    if (!inquiryText.value) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(inquiryText.value);
      if (copyStatus) copyStatus.textContent = 'Treść została skopiowana. Możesz wkleić ją do wiadomości e-mail.';
    } catch {
      inquiryText.focus({ preventScroll: true });
      inquiryText.select();
      if (copyStatus) copyStatus.textContent = 'Zaznaczono treść. Skopiuj ją skrótem Ctrl+C lub ⌘C albo poleceniem Kopiuj.';
    }
  });
}

function initGallery() {
  const dialog = document.getElementById('gallery-dialog');
  const image = document.getElementById('gallery-image');
  const caption = document.getElementById('gallery-caption');
  const closeButton = document.getElementById('gallery-close');
  let lastTrigger = null;

  document.querySelectorAll('[data-gallery-image]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const source = trigger.getAttribute('data-gallery-image');
      if (!source) return;
      const url = new URL(source, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      if (!dialog || !image || typeof dialog.showModal !== 'function') {
        if (!trigger.matches('a[href]')) window.location.assign(url.href);
        return;
      }

      event.preventDefault();
      lastTrigger = trigger;
      const alt = trigger.getAttribute('data-gallery-alt') || 'Klimatyzacja przemysłowa';
      image.src = url.href;
      image.alt = alt;
      if (caption) caption.textContent = alt;
      if (!dialog.open) dialog.showModal();
    });
  });

  if (!dialog || typeof dialog.close !== 'function') return;
  if (closeButton) {
    closeButton.type = 'button';
    closeButton.addEventListener('click', () => dialog.close());
  }
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
    ) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  });
}

function init() {
  initMenu();
  initInquiry();
  initGallery();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}
