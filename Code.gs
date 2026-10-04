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
    return jsonVastus(
      true,
      "Server sai mänguseisu kätte: " + mangulaud.join(","),
    )
  } catch (viga) {
    return jsonVastus(
      false,
      "Mänguseisu vastuvõtmine ebaõnnestus: " + viga.message,
    )
  }
}

// Ühesugune JSON-vastus nii õnnestumise kui ka vea korral.
function jsonVastus(ok, teade) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: ok, teade: teade }),
  ).setMimeType(ContentService.MimeType.JSON)
}
