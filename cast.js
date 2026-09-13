/*

* ============================================================
* Počúvam Rádiá
* cast.js
* ============================================================
* 
* Google Cast pre internetové rádiá.
* 
* Funkcie:
* - inicializácia Google Cast
* - pripojenie k Cast zariadeniu
* - odpojenie
* - zistenie stavu
* - nastavenie aktuálneho rádia
* - odoslanie aktuálneho rádia do Cast zariadenia
* - zmena rádia počas aktívneho Castu
* - zachovanie funkcie googleCastPreparing()
* - verejné PocuvamRadiaCast API
* 
* ============================================================
  */

(function () {

"use strict";

/* ============================================================
PREMENNÉ
============================================================ */

let castContext = null;

let castSession = null;

let currentCastRadio = null;

let castInitialized = false;

let castState = "odpojene";

/* ============================================================
KONŠTANTY
============================================================ */

const DEFAULT_RECEIVER_ID =
"CC1AD845";

/* ============================================================
ZÍSKANIE CAST API
============================================================ */

function isGoogleCastAvailable() {

return (
  typeof window !== "undefined" &&
  typeof window.cast !== "undefined" &&
  typeof window.cast.framework !== "undefined"
);

}

/* ============================================================
SPRÁVA V PREHRÁVAČI
============================================================ */

function updateCastMessage(message) {

const element =
  document.getElementById(
    "castMessage"
  );

if (!element) {
  return;
}

element.textContent =
  message || "";

}

/* ============================================================
AKTUALIZÁCIA CAST TLAČIDLA
============================================================ */

function updateCastButton() {

const button =
  document.getElementById(
    "castButton"
  );

if (!button) {
  return;
}


if (castState === "pripojene") {

  button.classList.add(
    "cast-connected"
  );

  button.setAttribute(
    "aria-label",
    "Google Cast - pripojené"
  );

  button.title =
    "Google Cast - pripojené";

} else {

  button.classList.remove(
    "cast-connected"
  );

  button.setAttribute(
    "aria-label",
    "Google Cast"
  );

  button.title =
    "Google Cast";

}

}

/* ============================================================
INICIALIZÁCIA GOOGLE CAST
============================================================ */

function initializeGoogleCast() {

if (castInitialized) {
  return;
}


/*
 * Ak Cast SDK ešte nie je načítané,
 * počkáme na jeho načítanie.
 */

if (!isGoogleCastAvailable()) {

  castState =
    "odpojene";

  updateCastButton();

  return;

}


try {

  castContext =
    window.cast.framework
      .CastContext
      .getInstance();


  /*
   * Nastavenie predvoleného prijímača.
   */

  castContext.setOptions({

    receiverApplicationId:
      DEFAULT_RECEIVER_ID,

    autoJoinPolicy:
      window.chrome.cast
        .AutoJoinPolicy
        .ORIGIN_SCOPED

  });


  castInitialized =
    true;


  /*
   * Sledujeme zmenu stavu Cast relácie.
   */

  castContext.addEventListener(

    window.cast.framework
      .CastContextEventType
      .SESSION_STATE_CHANGED,

    handleSessionStateChanged

  );


  /*
   * Získame existujúcu reláciu,
   * ak už používateľ Cast používa.
   */

  castSession =
    castContext.getCurrentSession();


  if (castSession) {

    castState =
      "pripojene";

  } else {

    castState =
      "odpojene";

  }


  updateCastButton();


} catch (error) {

  castInitialized =
    false;

  castState =
    "odpojene";

  updateCastButton();

  console.error(
    "Google Cast inicializácia:",
    error
  );

}

}

/* ============================================================
ZMENA STAVU RELÁCIE
============================================================ */

function handleSessionStateChanged(event) {

if (!event) {
  return;
}


const state =
  event.sessionState;


if (
  state ===
  window.cast.framework
    .SessionState
    .SESSION_STARTED
) {

  castSession =
    castContext.getCurrentSession();

  castState =
    "pripojene";

  updateCastButton();


  /*
   * Po pripojení automaticky odošleme
   * aktuálne rádio.
   */

  sendCurrentRadioToCast();


  return;
}


if (
  state ===
  window.cast.framework
    .SessionState
    .SESSION_RESUMED
) {

  castSession =
    castContext.getCurrentSession();

  castState =
    "pripojene";

  updateCastButton();


  sendCurrentRadioToCast();


  return;
}


if (
  state ===
  window.cast.framework
    .SessionState
    .SESSION_ENDED
) {

  castSession =
    null;

  castState =
    "odpojene";

  updateCastButton();

  updateCastMessage("");

}

}

/* ============================================================
PRIPOJENIE
============================================================ */

async function connectGoogleCast() {

if (!isGoogleCastAvailable()) {

  updateCastMessage(
    "Google Cast nie je dostupný."
  );

  return;

}


/*
 * Ak ešte Cast nie je inicializovaný,
 * inicializujeme ho.
 */

if (!castInitialized) {

  initializeGoogleCast();

}


if (!castContext) {

  updateCastMessage(
    "Google Cast sa nepodarilo inicializovať."
  );

  return;

}


try {

  await castContext.requestSession();

  castSession =
    castContext.getCurrentSession();

  castState =
    "pripojene";

  updateCastButton();


  sendCurrentRadioToCast();


} catch (error) {

  console.error(
    "Google Cast pripojenie:",
    error
  );


  castState =
    "odpojene";

  updateCastButton();

}

}

/* ============================================================
ODPOJENIE
============================================================ */

function disconnectGoogleCast() {

try {

  if (castContext) {

    castContext.endCurrentSession(
      true
    );

  }

} catch (error) {

  console.error(
    "Google Cast odpojenie:",
    error
  );

}


castSession =
  null;

castState =
  "odpojene";

updateCastButton();

updateCastMessage("");

}

/* ============================================================
PREPNUTIE CASTU
============================================================ */

function toggleGoogleCast() {

if (
  castState ===
  "pripojene"
) {

  disconnectGoogleCast();

} else {

  connectGoogleCast();

}

}

/* ============================================================
AKTUÁLNE RÁDIO
============================================================ */

function setCastRadio(radio) {

currentCastRadio =
  radio || null;


/*
 * Ak je Cast už pripojený,
 * nové rádio okamžite odošleme.
 */

if (
  castState ===
  "pripojene"
) {

  sendCurrentRadioToCast();

}

}

/* ============================================================
ZÍSKANIE AKTUÁLNEHO RÁDIA
============================================================ */

function getCastRadio() {

return currentCastRadio;

}

/* ============================================================
VYTVORENIE METADÁT
============================================================ */

function createCastMetadata(radio) {

if (
  typeof window.chrome ===
  "undefined" ||
  !window.chrome.cast ||
  !window.chrome.cast.media
) {

  return null;

}


const metadata =
  new window.chrome.cast.media
    .MusicTrackMediaMetadata();


metadata.title =
  radio.name ||
  "Počúvam Rádiá";


/*
 * Ak máme interpreta zo získaných
 * metadát rádia, použijeme ho.
 */

if (radio.artist) {

  metadata.artist =
    radio.artist;

}


return metadata;

}

/* ============================================================
ODOSLANIE RÁDIA DO CASTU
============================================================ */

function sendCurrentRadioToCast() {

if (!currentCastRadio) {
  return;
}


if (!currentCastRadio.stream) {
  return;
}


if (!castSession) {
  return;
}


if (
  typeof window.chrome ===
  "undefined" ||
  !window.chrome.cast ||
  !window.chrome.cast.media
) {

  return;

}


try {

  /*
   * Vytvorenie MediaInfo.
   */

  const mediaInfo =
    new window.chrome.cast.media
      .MediaInfo(
        currentCastRadio.stream,
        "audio/mpeg"
      );


  /*
   * Internetové rádio je živý stream.
   */

  mediaInfo.streamType =
    window.chrome.cast.media
      .StreamType
      .LIVE;


  /*
   * Názov rádia.
   */

  mediaInfo.metadata =
    createCastMetadata(
      currentCastRadio
    );


  /*
   * Vytvorenie LoadRequest.
   */

  const request =
    new window.chrome.cast.media
      .LoadRequest(
        mediaInfo
      );


  /*
   * Načítanie rádia do Cast zariadenia.
   */

  castSession
    .loadMedia(request)
    .then(function () {

      castState =
        "pripojene";

      updateCastButton();

    })
    .catch(function (error) {

      console.error(
        "Google Cast prehrávanie:",
        error
      );

    });


} catch (error) {

  console.error(
    "Google Cast MediaInfo:",
    error
  );

}

}

/* ============================================================
AKTUALIZÁCIA METADÁT POČAS CASTU
============================================================ */

function updateCastMetadata(
title,
artist
) {

if (!castSession) {
  return;
}


if (
  !castSession
    .getMediaSession()
) {

  return;

}


const mediaSession =
  castSession.getMediaSession();


if (!mediaSession) {
  return;
}


/*
 * Pri živom rádiu sa môže meniť názov
 * skladby. Pokúsime sa aktualizovať
 * informácie na Cast zariadení.
 */

try {

  const mediaInfo =
    mediaSession.media;

  if (!mediaInfo) {
    return;
  }


  const metadata =
    mediaInfo.metadata;


  if (!metadata) {
    return;
  }


  if (title) {

    metadata.title =
      title;

  }


  if (artist) {

    metadata.artist =
      artist;

  }


  mediaSession
    .editTracksInfo();


} catch (error) {

  /*
   * Ak konkrétne zariadenie aktualizáciu
   * nepodporuje, prehrávanie pokračuje.
   */

  console.error(
    "Google Cast metadata:",
    error
  );

}

}

/* ============================================================
STAV CASTU
============================================================ */

function getCastState() {

return castState;

}

/* ============================================================
JE CAST AKTÍVNY?
============================================================ */

function isCasting() {

return (
  castSession !== null &&
  castState ===
  "pripojene"
);

}

/* ============================================================
STARŠIA FUNKCIA
============================================================

 Funkcia zostáva zachovaná kvôli kompatibilite
 s existujúcim index.html.
 
 Už však nezobrazuje starú hlášku
 "Google Cast pripravujeme."
 
 Namiesto toho priamo spúšťa Cast.
 */

function googleCastPreparing() {

toggleGoogleCast();

}

/* ============================================================
START CASTING
============================================================ */

function startCasting() {

connectGoogleCast();

}

/* ============================================================
STOP CASTING
============================================================ */

function stopCasting() {

disconnectGoogleCast();

}

/* ============================================================
VEREJNÉ API
============================================================ */

window.PocuvamRadiaCast = {

initialize:
  initializeGoogleCast,

setRadio:
  setCastRadio,

getRadio:
  getCastRadio,

getState:
  getCastState,

connect:
  connectGoogleCast,

disconnect:
  disconnectGoogleCast,

toggle:
  toggleGoogleCast,

start:
  startCasting,

stop:
  stopCasting,

isCasting:
  isCasting,

sendCurrentRadio:
  sendCurrentRadioToCast,

updateMetadata:
  updateCastMetadata,

isAvailable:
  isGoogleCastAvailable,

prepare:
  googleCastPreparing

};

/* ============================================================
GLOBÁLNA FUNKCIA PRE EXISTUJÚCE TLAČIDLO
============================================================ */

window.googleCastPreparing =
googleCastPreparing;

/* ============================================================
AUTOMATICKÁ INICIALIZÁCIA
============================================================ */

function startCastInitialization() {

/*
 * Ak SDK ešte nie je pripravené,
 * počkáme krátko a skúsime znova.
 */

if (
  isGoogleCastAvailable()
) {

  initializeGoogleCast();

  return;

}


let attempts = 0;

const maxAttempts =
  20;


const timer =
  window.setInterval(
    function () {

      attempts++;


      if (
        isGoogleCastAvailable()
      ) {

        window.clearInterval(
          timer
        );

        initializeGoogleCast();

        return;

      }


      if (
        attempts >=
        maxAttempts
      ) {

        window.clearInterval(
          timer
        );

      }

    },
    500
  );

}

/* ============================================================
SPUSTENIE
============================================================ */

if (
document.readyState ===
"loading"
) {

document.addEventListener(
  "DOMContentLoaded",
  startCastInitialization
);

} else {

startCastInitialization();

}

})();
