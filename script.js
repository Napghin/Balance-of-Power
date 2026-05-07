// 1. PERMANENTER SPEICHER (Sicher verpackt)
let metaProgress = {
    hoffnungGesamt: 0,
    blutGesamt: 0
};

try {
    // Nur HIER drin darf localStorage stehen!
    let h = localStorage.getItem('hoffnungGesamt');
    let b = localStorage.getItem('blutGesamt');
    
    if (h) metaProgress.hoffnungGesamt = parseInt(h) || 0;
    if (b) metaProgress.blutGesamt = parseInt(b) || 0;
} catch (e) {
    // Falls Firefox hier abstürzt, wird der Fehler abgefangen
    console.error("Speicher-Fehler ignoriert: Browser-Datenbank ist korrupt.");
}

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
    },
    boese: { 
        res: 50, 
        arbeiter: 0, 
        kostenArbeiter: 60, 
    },
    balance: 50 
};

// 4. SCHLACHTFELD-STRUKTUR
let feldLaenge = 20;
let maxBreite = 1; 
let schlachtfeld = [];

// Das Feld beim Start einmalig mit leeren "Fächern" füllen
for (let i = 0; i < feldLaenge; i++) {
    schlachtfeld.push([]); 
}

// 5. EINHEITEN-KATALOG

function erstelleEinheit(name) {
    // Schaut im Katalog nach dem Namen (z.B. 'ritter') 
    // und gibt eine Kopie {...} davon zurück
    return { ...einheitenStats[name] }; 
}

const einheitenStats = {
    ritter: {
        typ: 'R',
        seite: 'gut',
        kosten: 20,
        hp: 12,
        masse: 2,
        schaden: 5,
        auraDruck: 0.1,
        position: 0
    },
    skelett: {
        typ: 'S',
        seite: 'boese',
        kosten: 40,
        hp: 8,
        masse: 1,
        schaden: 6,
        auraDruck: 0.3,
        position: feldLaenge - 1 // Startet ganz rechts
    }
};

// 6. Spawn Funktion

function spawnEinheit(name) {
    let stats = einheitenStats[name];
    let seite = stats.seite; // 'gut' oder 'boese'
    let konto = daten[seite];

    if (konto.res >= stats.kosten) {
        konto.res -= stats.kosten;
        
        let neueEinheit = erstelleEinheit(name);
        
        if (seite === 'gut') {
            schlachtfeld[0].push(neueEinheit);
        } else {
            schlachtfeld[feldLaenge - 1].push(neueEinheit);
        }
        
        updateUI();
    } else {
        console.log("Nicht genug Ressourcen!");
    }
}

// 7. SPIEL-MOTOR
setInterval(() => {
    // Ressourcen generieren
    daten.gut.res += (1 + daten.gut.arbeiter);
    daten.boese.res += (1 + daten.boese.arbeiter);

	let kriegerGut = 0;
	let kriegerBoese = 0;
	let auraDruckGut = 0;
	let auraDruckBoese = 0;

	// Wir scannen das ganze Feld
	for (let fach of schlachtfeld) {
    		for (let einheit of fach) {
        		if (einheit.seite === 'gut') {
            	           kriegerGut++;
                           auraDruckGut += einheit.auraDruck;
       			} else {
            		   kriegerBoese++;
                           auraDruckBoese += einheit.auraDruck;
       			}
    		}
}

    // Meta-Währung generieren (Basierend auf Kriegern)
    	rundeErtrag.hoffnung += kriegerGut * 0.5;
	rundeErtrag.blut += kriegerBoese * 0.5;

    // Balance berechnen
    	let chaos = (Math.random() - 0.5) * 0.1;
	daten.balance += (auraDruckGut - auraDruckBoese + chaos);

    updateUI();
    checkGameOver();
}, 1000);

// 8. FUNKTIONEN
function kaufeArbeiter(seite) {
    let f = daten[seite];
    if (f.res >= f.kostenArbeiter) {
        f.res -= f.kostenArbeiter;
        f.arbeiter++;
        f.kostenArbeiter = Math.round(f.kostenArbeiter * 1.25);
        updateUI();
    }
}

function updateUI() {
    // Ressourcen
    document.getElementById('res-gut').innerText = "Glaube: " + Math.floor(daten.gut.res);
    document.getElementById('work-gut').innerText = "Arbeiter: " + daten.gut.arbeiter + " (Preis: " + daten.gut.kostenArbeiter + ")";
    

    document.getElementById('res-boese').innerText = "Furcht: " + Math.floor(daten.boese.res);
    document.getElementById('work-boese').innerText = "Sklaven: " + daten.boese.arbeiter + " (Preis: " + daten.boese.kostenArbeiter + ")";
    
    // Einheiten
    let countGut = 0;
    let countBoese = 0;
    for (let fach of schlachtfeld) {
    for (let einheit of fach) {
        if (einheit.seite === 'gut') countGut++;
        else countBoese++;
    }
}
	// Einheiten anzeigen
        document.getElementById('gut').querySelector('h2').innerText = "Ritter: " + countGut;
	document.getElementById('boese').querySelector('h2').innerText = "Skelette: " + countBoese;

    // Run-Ertrag Anzeige
    document.getElementById('run-hoffnung').innerText = Math.floor(rundeErtrag.hoffnung);
    document.getElementById('run-blut').innerText = Math.floor(rundeErtrag.blut);

    // Meta-Anzeige (Gesamt)
    document.getElementById('meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
    document.getElementById('meta-blut').innerText = metaProgress.blutGesamt;


    // SCHLACHTFELD Aktualisieren
    let feldText = "";
    for (let i = 0; i < feldLaenge; i++) {
        if (schlachtfeld[i].length === 0) {
            feldText += "."; // Leeres Feld
        } else {
            // Zeige den Typ der ersten Einheit im Stapel (z.B. 'R' oder 'S')
            feldText += schlachtfeld[i][0].typ; 
        }
    }
    document.getElementById('battle-display').innerText = `[${feldText}]`;

    // Balken bewegen
    document.getElementById('pointer').style.left = daten.balance + "%";
}


function aktualisiereButtonTexte() {
    // Ritter-Button
    document.getElementById('btn-ritter').innerText = 
        `Ritter entsenden (${einheitenStats.ritter.kosten})`;

    // Skelett-Button
    document.getElementById('btn-skelett').innerText = 
        `Skelett beschwören (${einheitenStats.skelett.kosten})`;
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


aktualisiereButtonTexte()
