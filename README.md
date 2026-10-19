# Kaja Cvetko

React portfolio z Vite.

```sh
npm install
npm run dev
```

Produkcijska različica: `npm run build`. Predogled: `npm run preview`.

## Objava na GitHub Pages

V repozitoriju odpri **Settings → Pages → Build and deployment** in nastavi **Source: GitHub Actions**. V **Custom domain** ohrani `www.kajacvetko.si`; ko je certifikat pripravljen, vklopi **Enforce HTTPS**.

Workflow `.github/workflows/deploy.yml` ob pushu na `main` namesti odvisnosti z `npm ci`, zgradi aplikacijo in objavi samo mapo `dist`. Zaženeš ga lahko tudi ročno v **Actions → Deploy to GitHub Pages → Run workflow**. Napredek in napake preveri v zavihku **Actions**.

Privzeti Vite `base: '/'` ustreza lastni domeni. Skript `scripts/build-pages.mjs`, ki se izvede pri `npm run build`, pripravi HTML vstopne datoteke za vse štiri strani v vseh treh jezikih. Zato neposredno odpiranje in osvežitev `/sl/o-meni/` ter drugih obstoječih poti delujeta tudi brez strežniških SPA preusmeritev. Ob dodajanju novih poti ali jezikov dopolni tudi ta skript.

Ob vsakem odprtju se prikaže bel uvod s temnim podpisom v pisavi Playlist Script. Po 1,6 sekunde se bela plast skupaj s podpisom odpelje navzdol. 200 ms za njo se navzdol odpelje še slika in razkrije domačo stran. Vsak premik traja 2 sekundi. Uvod počaka na nalaganje pisave in slike (največ 2,5 sekunde). Pri zmanjšanem gibanju po 350 ms neposredno pokaže domačo stran, brez vmesnega prikaza slike in animacij.

Pisava: Playlist Script, Artimasa. Referenca: https://fontmeme.com/fonts/playlist-script-font/
Lokalna WOFF2 datoteka: https://db.onlinewebfonts.com/t/1fed4454352f201d52b65ca5480afb2d.woff2

Domača stran vsebuje vodoravno galerijo: na desktopu sta vidni dve vrstici s štirimi slikami (8 slik). Vseh 24 mest trenutno uporablja isto placeholder sliko z različnimi izrezi; prava Kajina dela dodamo naknadno. Kolesce miške premika galerijo vodoravno, tudi ko se kazalec nahaja nad headerjem ali footerjem. Ob robovih galerije se kazalec spremeni v črn krog z belo puščico; klik premakne galerijo v to smer. Podprte so tudi smerne tipke ob fokusu galerije in vodoravni dotik na telefonu.

Placeholder uvodna slika: uporabnikova povezava Reddit (Van Gogh close-ups), lokalno v `public/images/intro-painting.jpg`.

Galerija se neskončno ponavlja v obe smeri. Tri kopije slik in neopazen premik za celotno dolžino cikla ohranjajo zapolnjena oba robova in tekoče pomikanje.

Detail slike: hover rahlo poveča vsebino in prikaže črn krožni kazalec z naslovom. Klik odpre modalni prikaz s povečavo slike in belim ozadjem, ki se razkrije od spodaj navzgor. Zapiranje deluje z gumbom Zapri in Escape; fokus se vrne na izbrano sliko. Nastavitev zmanjšanega gibanja izklopi povečavo in prehod ozadja.

Zapiranje detaila obrne prehod: belo ozadje se umakne navzdol, slika pa se vrne na izvorno mesto. Izvorna slika ostane skrita do konca prehoda.

Detail screen ima levo mrežo dodatnih slik (dve v vrsti), glavno sliko na sredini ter naslov in začasni opis desno. Kazalec nad dodatnimi slikami prikazuje »Povečaj«; klik zamenja glavno sliko. Pred povratno animacijo se glavna slika ponastavi na original in počaka na dekodiranje. Celotna bela plošča z dodatnimi slikami, opisom in gumbom se pripelje od spodaj ter se ob zapiranju umakne navzdol, glavna slika pa ohrani prehod iz galerije in nazaj.

Navigacija: O meni, Razstave in Kontakt so ločeni paneli s placeholder vsebino. Dostopni so prek menija, vrnitev v galerijo pa prek podpisa Kaja Cvetko. Prehod traja 1,6 sekunde; galerija se nagne v perspektivi in odpelje navzgor. Header in footer ostaneta na mestu. Scroll ne preklaplja med paneli. Zmanjšano gibanje izklopi prehode.

## Jeziki in dodajanje slik

Podprti jeziki so slovenščina (`/sl/`), nemščina (`/de/`) in angleščina (`/en/`). Izbirnik je desno od kontakta; izbira se shrani lokalno. Povezava z jezikovno predpono ima prednost pred shranjeno nastavitvijo. Pri objavi mora strežnik za te poti vračati `index.html` (SPA fallback).

- Besedila vmesnika in sekcij: `src/locales/sl.json`, `de.json`, `en.json`.
- Podatki del: `src/data/paintings.js`. Vsako delo ima stabilen `id`, `image`, `additionalImages`, `position` in `translations` za `sl`, `de`, `en` z `title`, `description`, `alt`.
- Fotografije dodaj v `public/images/`, nato dodaj zapis v seznam `paintings`. Trenutni `Array.from` ustvari začasne primere; ob dodajanju pravih del ga zamenjaj z navadnim seznamom zapisov. Desktop galerija podpira tudi liho število del.
- Če manjka posamezen prevod, se uporabi slovenska vrednost. Jezik se uporabi tudi za alternativne opise slik, dostopnost, naslov dokumenta in meta opis.

Razstave dodajamo v `src/data/exhibitions.js`: vsak zapis ima `id`, `year`, `city` in `translations.sl/de/en.title`. Seznam v sekciji Razstave se napolni samodejno in ob menjavi jezika prevede naslove; manjkajoče prevode nadomesti slovenščina.

## Ločene strani

Trenutno so aktivne samostojne poti: `/sl/`, `/sl/o-meni/`, `/sl/razstave/`, `/sl/kontakt/` (enako za `de` in `en`). Navigacija podpira neposreden obisk, osvežitev ter gumba nazaj/naprej; menjava jezika ohrani trenutno stran. Uvod se ob neposrednem obisku vsebinskih strani preskoči. Gostovanje mora za vse poti uporabljati SPA fallback na `index.html`.

Prejšnja animirana implementacija `PagePanels` je zakomentirana v `src/main.jsx`; za obnovitev odkomentiraj funkcijo in v `App` zamenjaj `<PageContent ... />` z `<PagePanels ... />`. Njeni slogi so ohranjeni.

Galerija trenutno uporablja 19 del iz `public/images/slika1`–`slika19`: datoteka z `_main` je glavna, ostalih 39 fotografij je razporejenih med dodatne slike pripadajočih del. `slika4` je Deroči potok z ohranjenimi podatki; ostala dela imajo začasne številčne naslove v vseh treh jezikih. Mapa `slika17` uporablja obstoječe ime glavne datoteke `slika18_main.jpg`.

## Optimizacija slik

Fotografije na strani uporabljajo WebP, največ 2400 px po daljši stranici (kakovost 87). Za sezname so pripravljene različice do 640 px (kakovost 82). Logotip uporablja lossless WebP; prosojnost in razmerja so ohranjeni. Upoštevana je EXIF orientacija, metapodatki se ne prenašajo.

`src/data/imageVariants.json` vsebuje širine za odzivni `srcset`. Galerija in dodatne fotografije uporabljajo odloženo nalaganje, začetne vidne slike pa se nalagajo takoj. Detail uporablja večjo različico.

Originali so ohranjeni v `assets-original/public/`, prejšnja arhivska mapa pa v `assets-original/images_original/`. Arhiva sta zunaj `public` in se ne vključita v produkcijsko objavo.

Za nove JPG/PNG fotografije: `python3 scripts/optimize_images.py` (potrebuje Pillow). Skript shrani original, ustvari WebP in manjšo različico, nato obnovi manifest. V podatkih slik uporabi nastalo pot `.webp`. Podrobno poročilo o prvotni in novi velikosti je v `scripts/image-optimization.json`.
