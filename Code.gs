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
    const arvutiKaik = arvutaArvutiKaik(mangulaud)
    return jsonVastus(
      true,
      "Server sai mänguseisu kätte: " + mangulaud.join(","),
      arvutiKaik,
    )
  } catch (viga) {
    return jsonVastus(
      false,
      "Mänguseisu vastuvõtmine ebaõnnestus: " + viga.message,
    )
  }
}

// Ühesugune JSON-vastus nii õnnestumise kui ka vea korral.
function jsonVastus(ok, teade, arvutiKaik = null) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: ok, teade: teade, arvutiKaik: arvutiKaik }),
  ).setMimeType(ContentService.MimeType.JSON)
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
  // Kombinatsioonid kasutavad massiivi indekseid 0–8, mitte ruudunumbreid.
  const kombinatsioonid = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // read
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // veerud
    [0, 4, 8],
    [2, 4, 6], // diagonaalid
  ]

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
