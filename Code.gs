// Google Apps Script käivitab selle funktsiooni, kui veebirakendus avatakse.
function doGet() {
  // Apps Scriptis on HTML-faili nimi „leht” (siin projektis leht.html).
  return HtmlService.createHtmlOutputFromFile('leht')
    .setTitle('Trips-Traps-Trull kaameraga');
}
