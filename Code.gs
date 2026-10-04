// Asenda placeholder oma olemasoleva Google Sheetsi faili ID-ga.
const SHEET_ID = "1Y9X40DOOqllHw7FYNz8cJLiUvd-vRtvHxtGOLh4oZWA"
const SHEET_NAME = "Manguseisud"

// Google Apps Script käivitab selle funktsiooni, kui veebirakendus avatakse.
function doGet() {
  // Apps Scriptis on HTML-faili nimi „leht” (siin projektis leht.html).
  return HtmlService.createHtmlOutputFromFile("leht").setTitle(
    "Trips-Traps-Trull kaameraga",
  )
}

// POST-päring kutsub selle funktsiooni välja, kui veebilehel vajutatakse saatmisnuppu.
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Päringu sisu puudub.")
    }

    // Kuigi päringu sisutüüp on text/plain, on selle tekst JSON-kujul.
    const andmed = JSON.parse(e.postData.contents)
    const mangulaud = andmed && andmed.mangulaud

    if (!Array.isArray(mangulaud) || mangulaud.length !== 9) {
      throw new Error("Mängulaud peab olema täpselt 9 elemendiga massiiv.")
    }

    // Lubame ainult kokkulepitud väärtusi: sinine, oranž või tühi.
    for (let i = 0; i < mangulaud.length; i++) {
      if (mangulaud[i] !== "S" && mangulaud[i] !== "O" && mangulaud[i] !== "") {
        throw new Error("Ruudus " + (i + 1) + " on lubamatu väärtus.")
      }
    }

    Logger.log("Saadud mänguseis: " + JSON.stringify(mangulaud))

    let siniseid = 0
    let oranze = 0
    for (let i = 0; i < mangulaud.length; i++) {
      if (mangulaud[i] === "S") siniseid++
      if (mangulaud[i] === "O") oranze++
    }

    // Sinine alustab: nuppude arv on võrdne või siniseid on üks rohkem.
    if (siniseid !== oranze && siniseid !== oranze + 1) {
      throw new Error("Nuppude arv ei vasta mängukorrale.")
    }

    const sinineVoitis = kasOnVoit(mangulaud, "S")
    const oranzVoitis = kasOnVoit(mangulaud, "O")
    if (sinineVoitis && oranzVoitis) {
      throw new Error("Mõlemal mängijal ei saa korraga olla võitu.")
    }
    // Võit peab sobima viimase käigu tegija nuppude arvuga.
    if (
      (sinineVoitis && siniseid !== oranze + 1) ||
      (oranzVoitis && siniseid !== oranze)
    ) {
      throw new Error("Võitja ja nuppude arv ei sobi kokku.")
    }

    const voitja = kontrolliVoitjat(mangulaud)
    if (voitja === "S") {
      salvestaManguseis(mangulaud, "S_VOIT", null)
      return jsonVastus(true, "Mäng läbi – SININE võitis!", null, "S_VOIT")
    }
    if (voitja === "O") {
      salvestaManguseis(mangulaud, "O_VOIT", null)
      return jsonVastus(true, "Mäng läbi – ORANŽ võitis!", null, "O_VOIT")
    }

    // Täis laud on viik ainult siis, kui võitjat ei ole.
    if (siniseid + oranze === 9) {
      salvestaManguseis(mangulaud, "VIIK", null)
      return jsonVastus(true, "Mäng läbi – viik!", null, "VIIK")
    }
    if (siniseid === oranze) {
      salvestaManguseis(mangulaud, "INIMESE_KAIK", null)
      return jsonVastus(
        true,
        "Tee kõigepealt SININE käik ja saada mänguseis uuesti serverisse.",
        null,
        "INIMESE_KAIK",
      )
    }

    // Käigusoovitus arvutatakse ainult siis, kui on oranži kord.
    const arvutiKaik = arvutaArvutiKaik(mangulaud)
    salvestaManguseis(mangulaud, "ARVUTI_KAIK", arvutiKaik)
    return jsonVastus(
      true,
      "Server sai mänguseisu kätte: " + mangulaud.join(","),
      arvutiKaik,
      "ARVUTI_KAIK",
    )
  } catch (viga) {
    return jsonVastus(
      false,
      "Mänguseisu vastuvõtmine ebaõnnestus: " + viga.message,
    )
  }
}

// Lisame olemasolevasse serveritabelisse ühe rea iga korrektse päringu kohta.
function salvestaManguseis(mangulaud, olek, arvutiKaik) {
  if (SHEET_ID === "SIIA_GOOGLE_SHEETSI_ID") {
    throw new Error("Lisa SHEET_ID konstanti oma Google Sheetsi faili ID.")
  }

  const tabel = SpreadsheetApp.openById(SHEET_ID)
  const leht = tabel.getSheetByName(SHEET_NAME)
  if (!leht) {
    throw new Error('Google Sheetsis puudub leht nimega "' + SHEET_NAME + '".')
  }

  // Päise lisame ainult täiesti tühjale lehele. Olemasolevaid ridu ei muudeta.
  if (leht.getLastRow() === 0) {
    leht.appendRow([
      "Aeg",
      "Ruut 1",
      "Ruut 2",
      "Ruut 3",
      "Ruut 4",
      "Ruut 5",
      "Ruut 6",
      "Ruut 7",
      "Ruut 8",
      "Ruut 9",
      "Olek",
      "Arvuti käik",
    ])
  }

  // Rea 12 lahtrit: aeg, üheksa ruutu, olek ja käigusoovitus.
  // Tühjad ruudud ning null-käik salvestatakse tühja lahtrina.
  const rida = [new Date()].concat(mangulaud, [
    olek,
    arvutiKaik === null ? "" : arvutiKaik,
  ])
  leht.appendRow(rida)
}

// Ühesugune JSON-vastus nii õnnestumise kui ka vea korral.
function jsonVastus(ok, teade, arvutiKaik = null, olek = "VIGANE_SEIS") {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: ok,
      teade: teade,
      arvutiKaik: arvutiKaik,
      olek: olek,
    }),
  ).setMimeType(ContentService.MimeType.JSON)
}

// Mõlemad võidukontrollid kasutavad samu kaheksat kombinatsiooni.
// Siin on massiivi indeksid 0–8; kasutajale kuvatavad ruudud on 1–9.
const voidukombinatsioonid = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // read
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // veerud
  [0, 4, 8],
  [2, 4, 6], // diagonaalid
]

function kasOnVoit(mangulaud, mangija) {
  for (let i = 0; i < voidukombinatsioonid.length; i++) {
    const rida = voidukombinatsioonid[i]
    if (
      mangulaud[rida[0]] === mangija &&
      mangulaud[rida[1]] === mangija &&
      mangulaud[rida[2]] === mangija
    ) {
      return true
    }
  }
  return false
}

// Mõlema mängija korraga võitmine kontrollitakse doPost-is vigaseks seisuks.
function kontrolliVoitjat(mangulaud) {
  if (kasOnVoit(mangulaud, "S")) return "S"
  if (kasOnVoit(mangulaud, "O")) return "O"
  return null
}

// Tagastame ruudu numbri 1–9. Sisendmassiiivi me ei muuda.
function arvutaArvutiKaik(mangulaud) {
  // 1. Kõigepealt proovib arvuti ise võita.
  const voiduKaik = leiaVoiduKaik(mangulaud, "O")
  if (voiduKaik !== null) {
    return voiduKaik
  }

  // 2. Sama kontroll sinise jaoks näitab, kuhu panna blokeeriv oranž nupp.
  const blokeerivKaik = leiaVoiduKaik(mangulaud, "S")
  if (blokeerivKaik !== null) {
    return blokeerivKaik
  }

  // 3. Massiivi indeks 4 on mängulaua keskruut 5.
  if (mangulaud[4] === "") {
    return 5
  }

  // 4. Valime esimese vaba nurga järjekorras 1, 3, 7, 9.
  const nurgad = [0, 2, 6, 8]
  for (let i = 0; i < nurgad.length; i++) {
    if (mangulaud[nurgad[i]] === "") {
      return nurgad[i] + 1
    }
  }

  // 5. Kui keskus ja nurgad on hõivatud, sobib esimene muu vaba ruut.
  for (let i = 0; i < mangulaud.length; i++) {
    if (mangulaud[i] === "") {
      return i + 1
    }
  }

  // 6. Ühtegi vaba ruutu ei ole.
  return null
}

// Otsime kombinatsiooni, kus on kaks sama mängija nuppu ja üks tühi ruut.
function leiaVoiduKaik(mangulaud, mangija) {
  const kombinatsioonid = voidukombinatsioonid

  for (let i = 0; i < kombinatsioonid.length; i++) {
    const kombinatsioon = kombinatsioonid[i]
    let nuppudeArv = 0
    let tyhiIndeks = null

    for (let j = 0; j < kombinatsioon.length; j++) {
      const indeks = kombinatsioon[j]
      if (mangulaud[indeks] === mangija) {
        nuppudeArv++
      } else if (mangulaud[indeks] === "") {
        tyhiIndeks = indeks
      }
    }

    if (nuppudeArv === 2 && tyhiIndeks !== null) {
      return tyhiIndeks + 1
    }
  }
  return null
}
