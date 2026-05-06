// 1. PERMANENTER SPEICHER (Meta-Fortschritt)
let metaProgress = {
    hoffnungGesamt: parseInt(localStorage.getItem('hoffnungGesamt')) || 0,
    blutGesamt: parseInt(localStorage.getItem('blutGesamt')) || 0
};

// 2. AKTUELLE RUNDE
let rundeErtrag = {
    hoffnung: 0,
    blut: 0
};

// 3. BASIS-DATEN
let daten = {
    gut: { 
        res: 50, 
        arbeiter: 0, 
        kostenArbeiter: 40, 
        kriegerAktiv: 0,
        kraftProKrieger: 0.1, 
        kostenKrieger: 20
    },
    boese: { 
        res: 50, 
        arbeiter: 0, 
        kostenArbeiter: 60, 
        kriegerAktiv: 0,
        kraftProKrieger: 0.3, 
        kostenKrieger: 50
    },
    balance: 50 
};

// 4. SPIEL-MOTOR
setInterval(() => {
    // Ressourcen generieren
    daten.gut.res += (1 + daten.gut.arbeiter);
    daten.boese.res += (1 + daten.boese.arbeiter);

    // Meta-Währung generieren (Basierend auf Kriegern)
    rundeErtrag.hoffnung += daten.gut.kriegerAktiv * 0.5;
    rundeErtrag.blut += daten.boese.kriegerAktiv * 0.5;

    // Balance berechnen
    let druckGut = daten.gut.kriegerAktiv * daten.gut.kraftProKrieger;
    let druckBoese = daten.boese.kriegerAktiv * daten.boese.kraftProKrieger;
    let chaos = (Math.random() - 0.5) * 0.1;

    // Hier passiert das "Schieben"
    daten.balance += (druckGut - druckBoese + chaos);

    updateUI();
    checkGameOver();
}, 1000);

// 5. FUNKTIONEN
function kaufeArbeiter(seite) {
    let f = daten[seite];
    if (f.res >= f.kostenArbeiter) {
        f.res -= f.kostenArbeiter;
        f.arbeiter++;
        f.kostenArbeiter = Math.round(f.kostenArbeiter * 1.25);
        updateUI();
    }
}

function spawnEinheit(seite) {
    let f = daten[seite];
    if (f.res >= f.kostenKrieger) {
        f.res -= f.kostenKrieger;
        f.kriegerAktiv++;
        updateUI();
    }
}

function updateUI() {
    // Ressourcen & Einheiten
    document.getElementById('res-gut').innerText = "Glaube: " + Math.floor(daten.gut.res);
    document.getElementById('work-gut').innerText = "Arbeiter: " + daten.gut.arbeiter + " (Preis: " + daten.gut.kostenArbeiter + ")";
    document.getElementById('gut').querySelector('h2').innerText = "Ritter: " + daten.gut.kriegerAktiv;

    document.getElementById('res-boese').innerText = "Furcht: " + Math.floor(daten.boese.res);
    document.getElementById('work-boese').innerText = "Sklaven: " + daten.boese.arbeiter + " (Preis: " + daten.boese.kostenArbeiter + ")";
    document.getElementById('boese').querySelector('h2').innerText = "Skelette: " + daten.boese.kriegerAktiv;

    // Run-Ertrag Anzeige
    document.getElementById('run-hoffnung').innerText = Math.floor(rundeErtrag.hoffnung);
    document.getElementById('run-blut').innerText = Math.floor(rundeErtrag.blut);

    // Meta-Anzeige (Gesamt)
    document.getElementById('meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
    document.getElementById('meta-blut').innerText = metaProgress.blutGesamt;

    // Balken
    document.getElementById('pointer').style.left = daten.balance + "%";
}

function checkGameOver() {
    if (daten.balance <= 0 || daten.balance >= 100) {
        // Speichern
        metaProgress.hoffnungGesamt += Math.floor(rundeErtrag.hoffnung);
        metaProgress.blutGesamt += Math.floor(rundeErtrag.blut);
        localStorage.setItem('hoffnungGesamt', metaProgress.hoffnungGesamt);
        localStorage.setItem('blutGesamt', metaProgress.blutGesamt);

        alert("Run beendet! Ertrag gesichert.");
        location.reload(); 
    }
}