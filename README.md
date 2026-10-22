# Schładzamy

Strona marki REKORD poświęcona wynajmowi i sprzedaży klimatyzacji przemysłowej: sprzęt, zastosowania, dobór konfiguracji i zapytania o ofertę.

- Repozytorium: [PopielSeba/schladzamy](https://github.com/PopielSeba/schladzamy).
- Domena docelowa: **schladzamy.pl**.
- Publikacja na Vercel i konfiguracja domeny: **w przygotowaniu**.

## Budowanie i sprawdzanie

Wymagany **Node.js 22 lub nowszy**. Projekt nie ma zależności npm; instalacja pakietów nie jest potrzebna.

```bash
npm run build
npm run check
npm test
```

Build generuje kompletną statyczną stronę w katalogu `dist/`. Ten katalog jest wynikiem pracy generatora — treści i wygląd edytuje się w plikach źródłowych. Podgląd wymaga udostępnienia `dist/` przez serwer statyczny.

`check` sprawdza m.in. wymagane strony, metadane, adresy kanoniczne, lokalne odnośniki, obrazy, JSON-LD i mapę witryny. Testy obejmują przygotowanie zapytania: wynajem i zakup, modele, temperaturę, zasilanie oraz walidację danych.

### Adresy witryny

Domyślna konfiguracja:

```text
SITE_URL=https://schladzamy.pl
BASE_PATH=
```

`SITE_URL` określa publiczny adres używany w canonical, metadanych i sitemapie. `BASE_PATH` pozostaje pusty przy publikacji w katalogu głównym domeny. Przy budowaniu dla innego docelowego adresu należy podać go jawnie, np.:

```bash
SITE_URL=https://schladzamy.pl BASE_PATH="" npm run build
SITE_URL=https://schladzamy.pl BASE_PATH="" npm run check
```

Jeśli zmieniasz wartości środowiska na potrzeby sprawdzania innego adresu lub prefiksu, przekaż te same wartości również do `npm run check`.

## Podstrony

Generator przygotowuje **11 publicznych stron oraz stronę błędu 404**:

```text
/
/wynajem-klimatyzacji/
/sprzedaz-klimatyzacji/
/klimatyzatory/
/klimatyzatory/lennox-bah-085/
/klimatyzatory/carrier-fc93/
/klimatyzatory/dantherm-ac-m18/
/zastosowania/klimatyzacja-hal-namiotowych/
/zastosowania/klimatyzacja-imprez/
/zastosowania/klimatyzacja-magazynow/
/kontakt/
/404.html
```

Treści są generowane do HTML, a nawigacja prowadzi do osobnych adresów. Każda publiczna strona ma własny tytuł, opis i canonical. Projekt zawiera także sitemapę XML, robots.txt, dane strukturalne JSON-LD, opisy obrazów oraz lokalne fonty. Strona 404 nie jest przeznaczona do indeksowania.

## Gdzie wprowadzać zmiany

| Plik lub katalog | Zawartość |
| --- | --- |
| `src/content.mjs` | Dane firmy, urządzenia i specyfikacje, usługi, zastosowania oraz FAQ. |
| `src/templates.mjs` | HTML stron, nawigacja, formularz i metadane. |
| `public/styles.css` | Wygląd i układ responsywny. |
| `public/app.js` | Menu, galeria i przygotowanie zapytania e-mail. |
| `public/assets/` | Fotografie, fonty i licencje; źródła w `SOURCES.json`. |
| `scripts/build.mjs` i `scripts/check.mjs` | Generator oraz kontrola wyniku. |
| `tests/inquiry.test.mjs` | Testy logiki zapytania. |
| `docs/source-review.md` | Weryfikacja oferty, parametrów i rozbieżności źródeł. |
| `vercel.json` | Konfiguracja publikacji na Vercel. |

## Sprzęt i źródła

| Model | Moc prezentowana w ofercie | Ustalenie |
| --- | --- | --- |
| Lennox BAH 085 | ok. 85 kW | Wartość orientacyjna z aktualnej oferty floty. |
| Carrier FC93 | ok. 90 kW | Katalog REKORD podaje 90,18 kW dla oznaczenia 50FC-093. |
| Dantherm AC-M18 | 17,5 kW | Parametry dotyczą wersji 400 V / 3 fazy / 50 Hz. |

Źródła: [oferta klimatyzacji pozyczmnie.pl](https://www.pozyczmnie.pl/klimatyzacje-przemyslowe), [katalog REKORD](https://halenamiotowe.com.pl/wp-content/uploads/2025/02/Air-Conditioners.pdf) oraz [karta Dantherm AC-M18](https://www.danthermgroup.com/pl/produkty/dantherm-ac-m18).

Zdjęcia pochodzą z oficjalnych stron oferty. Opisy i parametry wymagające doprecyzowania są udokumentowane w [przeglądzie źródeł](docs/source-review.md). Dostępność, stan konkretnego egzemplarza, wyposażenie, cenę oraz warunki sprzedaży potwierdza się w indywidualnej ofercie.

## Jak działa zapytanie

Formularz **przygotowuje treść wiadomości w przeglądarce**. Użytkownik wybiera wynajem lub zakup, model albo prośbę o dobór, a następnie podaje m.in. lokalizację, zastosowanie, wymiary, oczekiwaną temperaturę i dostępne zasilanie. Przy wynajmie może wskazać termin oraz okres użytkowania.

Po przygotowaniu zapytania użytkownik może skopiować tekst lub otworzyć wiadomość we własnej poczcie. **Formularz nie wysyła wiadomości automatycznie i nie ma backendu.** Odbiorcą jest `dystrybucja@halenamiotowe.com.pl`; telefon oferty to **+48 571 294 344**.

Linki do kontaktu mogą wstępnie wybierać rodzaj oferty i model, np. `/kontakt/?oferta=zakup&model=carrier-fc93#zapytanie`. Zmiana adresata wymaga zachowania zgodności danych w `src/content.mjs` i `public/app.js`.

## Publikacja

Docelowy hosting: **Vercel**, konto **Sebastian's projects**, projekt **schladzamy**. Repozytorium GitHub przechowuje kod źródłowy.

Konfiguracja `vercel.json`:

- brak instalacji pakietów;
- polecenie build: `npm run build && npm run check && npm test`;
- katalog publikacji: `dist`;
- `trailingSlash: true`.

Wdrożenie, jego adres i rekordy DNS wymagane przez konkretny projekt Vercel są obecnie przygotowywane. Domena ma zostać połączona przez ustawienia DNS w **UT**, zgodnie z wartościami wskazanymi w panelu Vercel.

### Stan DNS przed podłączeniem Vercel

| Nazwa | Typ | Obecna wartość | Uwagi |
| --- | --- | --- | --- |
| `schladzamy.pl` / `@` | A | `54.38.201.206` | Do aktualizacji po uzyskaniu docelowych rekordów Vercel. |
| `www` | A | `54.38.201.206` | Do aktualizacji zgodnie z konfiguracją domeny w Vercel. |
| `schladzamy.pl` / `@` | MX | `plhost.ut.pl`, priorytet 10 | **Pozostawić bez zmiany — obsługa poczty.** |

Po wdrożeniu należy zweryfikować domenę, HTTPS, przekierowanie wybranego wariantu www, adresy canonical i sitemapę. Konkretny adres wdrożenia oraz finalne rekordy DNS zostaną dopisane po ich potwierdzeniu.
