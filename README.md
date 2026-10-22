# Schładzamy

Strona marki REKORD poświęcona wynajmowi i sprzedaży klimatyzacji przemysłowej: sprzęt, zastosowania, dobór konfiguracji i zapytania o ofertę.

- Repozytorium: [PopielSeba/schladzamy](https://github.com/PopielSeba/schladzamy).
- Domena docelowa: **schladzamy.pl**.
- Strona produkcyjna: [schladzamy.vercel.app](https://schladzamy.vercel.app/).
- Hosting: **Vercel — Sebastian's projects / schladzamy**.
- Domeny dodane w Vercel; **oczekują na zmianę rekordów DNS w UT**.

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

Strona jest wdrożona na **Vercel**, konto **Sebastian's projects**, projekt **schladzamy**. Gałąź produkcyjna to `main` w tym repozytorium GitHub; kolejne zmiany w tej gałęzi uruchamiają wdrożenie.

- [Działająca strona](https://schladzamy.vercel.app/)
- [Projekt w Vercel](https://vercel.com/sebastians-projects-e047c519/schladzamy)
- [Konfiguracja domen w Vercel](https://vercel.com/sebastians-projects-e047c519/schladzamy/settings/domains)
- Wdrożenie kodu: `35fd8bff9d40bda230cb3356cab00bde5fc2fc2e`.

Konfiguracja `vercel.json`:

- brak instalacji pakietów;
- polecenie build: `npm run build && npm run check && npm test`;
- katalog publikacji: `dist`;
- `trailingSlash: true`.

### Rekordy do ustawienia w UT

Wartości odczytane z konfiguracji **tego projektu** w Vercel 22 października 2026 r.:

| Nazwa / host | Typ | Wartość |
| --- | --- | --- |
| `@` | A | `216.198.79.1` |
| `www` | CNAME | `8b0b66351c55a405.vercel-dns-017.com.` |

1. Zmień dotychczasowy rekord A dla `@` z `54.38.201.206` na wskazany adres Vercel.
2. Zastąp dotychczasowy rekord A dla `www` (`54.38.201.206`) powyższym CNAME. Rekord A i CNAME nie mogą pozostać równocześnie dla tej samej nazwy `www`.
3. Zachowaj serwery nazw UT (`ns1.ut.pl`, `ns2.ut.pl`) i rekordy poczty. Istniejący MX to `plhost.ut.pl`, priorytet **10**. Zachowaj także ewentualne rekordy TXT weryfikacji i poczty.
4. TTL może pozostać dotychczasowy: **3600 sekund**.

Domena `schladzamy.pl` jest przypisana do **Production**. Dla `www.schladzamy.pl` zapisano **308 Permanent Redirect → schladzamy.pl**. W chwili przygotowania instrukcji obie domeny mają w Vercel status **Invalid Configuration**, ponieważ publiczny DNS nadal wskazuje parking UT. Wpisy w panelu UT pozostają do zmiany przez właściciela.

Po zmianie DNS należy sprawdzić propagację, aktywację HTTPS i przekierowanie www. Nie trzeba ponownie publikować kodu — adresy canonical, Open Graph i mapa witryny już wskazują `https://schladzamy.pl`.

### Kontrole po wdrożeniu

Weryfikacja 22 października 2026 r. na publicznym aliasie Vercel potwierdziła:

- wszystkie 11 publicznych stron zwraca HTTP 200;
- unikalne tytuły i opisy, po jednym H1, język polski i prawidłowe dane JSON-LD;
- poprawne canonicale do docelowej domeny, `robots.txt` oraz 11 adresów w `sitemap.xml`;
- rzeczywisty status 404 dla nieistniejącej strony, własny widok błędu i `noindex`;
- przekierowania 308 z HTTP do HTTPS i z adresu modelu bez końcowego ukośnika;
- dostępność 23 sprawdzonych zasobów CSS, JS, fontów i grafik;
- działanie galerii, formularza z przeniesionym modelem, menu mobilnego oraz układu przy szerokości telefonu.

Kontrola nie potwierdza jeszcze działania własnej domeny przed zmianą DNS ani indeksacji Google. Po uruchomieniu domeny można zgłosić w Google Search Console mapę `https://schladzamy.pl/sitemap.xml`. Weryfikacja własności w Search Console wymaga rekordu wygenerowanego dla tej konkretnej usługi i konta Google.
