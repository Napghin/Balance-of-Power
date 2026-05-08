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
        typ: 'R',           // Das Symbol auf dem Spielfeld (Buchstabe)
        seite: 'gut',       // Bestimmt die Marschrichtung (gut = rechts, boese = links)
        kosten: 20,         // Wie viel Gold/Glaube beim Spawnen abgezogen wird
        hp: 12,             // Lebenspunkte (bei 0 wird die Einheit gelöscht)
        masse: 2,           // Gewicht für die Frontlinie (wichtig fürs spätere Schieben)
        schaden: 5,         // Wie viel HP dem Gegner pro Treffer abgezogen werden
        reichweite: 1,      // 1 = Nahkampf, 2+ = Fernkampf (Scan-Distanz in Feldern)
        as: 3,              // Attack Speed: Sekunden Pause zwischen Schlägen (HÖHER = LANGSAMER)
        cooldown: 0,        // Interner Zähler: Muss auf 0 sein, damit die Einheit zuschlägt
        setup: 0,           // Wartezeit nach jeder Bewegung, bevor Angriff möglich (Zielen)
        aoeBreit: 1,        // Wie viele Gegner IM selben Feld gleichzeitig getroffen werden
        aoeTief: 1,         // Wie viele Felder DAHINTER zusätzlich getroffen werden
        moveWait: 1,        // Lauf-Pause: Wie viele Sekunden pro Schritt gewartet wird (0 = jede Sek.)
        moveTimer: 0,       // Interner Zähler: Regelt die Lauf-Verzögerung
        crowdFactor: 2,     // Drängel-Strafe: Zusätzliche Sekunden-Pause beim Durchlaufen von Freunden
        auraDruck: 0.1,     // Wie stark die Einheit den "Balken" (Druck) in ihre Richtung schiebt
        position: 0         // Startposition auf dem Array
    },
    skelett: {
        typ: 'S',
        seite: 'boese',
        kosten: 40,
        hp: 8,
        masse: 1,
        schaden: 6,
        reichweite: 1,
        as: 2,           
        cooldown: 0,     
        setup: 0,        
        aoeBreit: 1, 
        aoeTief: 1,      
        moveWait: 0, 
        moveTimer: 0,
        crowdFactor: 1,
        auraDruck: 0.3,
        position: feldLaenge - 1
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

    //EINHEITEN BEWEGEN 
   	 bewegeEinheiten();

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
    const display = document.getElementById('battle-display');
    display.innerHTML = ""; // Altes Feld löschen

    for (let i = 0; i < feldLaenge; i++) {
        // Wir erstellen einen "Slot" (die Spalte)
        let slotDiv = document.createElement('div');
        slotDiv.className = 'slot';

        // Wir loopen von oben nach unten (5 Plätze)
        for (let ebene = 4; ebene >= 0; ebene--) {
            let punkt = document.createElement('div');
            punkt.className = 'einheit-punkt';
            
            if (schlachtfeld[i][ebene]) {
                let e = schlachtfeld[i][ebene];
                punkt.innerText = e.typ;
                // Farbe zuweisen
                punkt.style.color = (e.seite === 'gut') ? '#55aaff' : '#ff5555';
                punkt.style.fontWeight = "bold";
            } else {
                punkt.innerText = ".";
                punkt.style.color = "#444";
            }
            slotDiv.appendChild(punkt);
        }
        display.appendChild(slotDiv);
    }

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
        
        // 1. Werte berechnen
        let gewonneneHoffnung = Math.floor(rundeErtrag.hoffnung || 0);
        let gewonnenesBlut = Math.floor(rundeErtrag.blut || 0);

        metaProgress.hoffnungGesamt += gewonneneHoffnung;
        metaProgress.blutGesamt += gewonnenesBlut;

        // 2. Der Try-Container für den LocalStorage
        try {
            localStorage.setItem('hoffnungGesamt', metaProgress.hoffnungGesamt);
            localStorage.setItem('blutGesamt', metaProgress.blutGesamt);
            console.log("Fortschritt lokal gespeichert.");
        } catch (e) {
            // Falls der Browser blockiert, loggen wir es nur, statt abzustürzen
            console.warn("Speichern im LocalStorage fehlgeschlagen (file:/// Modus).", e);
        }

        // 3. Den Spieler informieren
        let sieger = daten.balance >= 100 ? "DAS LICHT" : "DIE FINSTERNIS";
        alert("Run beendet! " + sieger + " hat gesiegt.\nErhaltene Hoffnung: " + gewonneneHoffnung + "\nErhaltenes Blut: " + gewonnenesBlut);
        
        // 4. Neustart
        location.reload();
    }
}

function bewegeEinheiten() {
    const richtungen = [
        { seite: 'gut', zielMod: 1, start: feldLaenge - 1, ende: 0, schritt: -1 },
        { seite: 'boese', zielMod: -1, start: 0, ende: feldLaenge - 1, schritt: 1 }
    ];

    for (let r of richtungen) {
        for (let i = r.start; r.schritt === -1 ? i >= r.ende : i <= r.ende; i += r.schritt) {
            for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
                let einheit = schlachtfeld[i][j];
                if (einheit.seite !== r.seite) continue;

                // 1. SCAN: Ist ein Gegner in Reichweite?
                let gegnerGefunden = false;
                let gegnerSlotIndex = -1; 

                for (let dist = 1; dist <= einheit.reichweite; dist++) {
                    let checkIdx = i + (dist * r.zielMod);
                    if (checkIdx >= 0 && checkIdx < feldLaenge) {
                        let zielSlot = schlachtfeld[checkIdx];
                        if (zielSlot.length > 0 && zielSlot[0].seite !== einheit.seite) {
                            gegnerGefunden = true;
                            gegnerSlotIndex = checkIdx; 
                            break; 
                        }
                    }
                }

                // 2. ENTSCHEIDUNG: Kampf, Basis-Belagerung oder Laufen
                if (gegnerGefunden) {
                    angriff(einheit, gegnerSlotIndex);
                } else {
                    let amEnde = (einheit.seite === 'gut' && i === feldLaenge - 1) || 
                                 (einheit.seite === 'boese' && i === 0);

                    if (amEnde) {
                        if (einheit.seite === 'gut') daten.balance += 5;
                        else daten.balance -= 5;
                        console.log(einheit.typ + " belagert die Basis!");
                    } else {
                        if (einheit.moveTimer > 0) {
                            einheit.moveTimer--;
                            continue;
                        }

                        let zielIdx = i + r.zielMod;
                        if (zielIdx >= 0 && zielIdx < feldLaenge) {
                            let zielSlot = schlachtfeld[zielIdx];
                            let istFreundBesetzt = zielSlot.length > 0 && zielSlot[0].seite === einheit.seite;
                            let istFeindBesetzt = zielSlot.length > 0 && zielSlot[0].seite !== einheit.seite;

                            if (!istFeindBesetzt && zielSlot.length < 5) {
                                schlachtfeld[i].splice(j, 1);
                                zielSlot.push(einheit);

                                let strafe = istFreundBesetzt ? (einheit.crowdFactor || 1) : 0;
                                einheit.moveTimer = (einheit.moveWait || 0) + strafe;

                                if (einheit.setup) einheit.cooldown = einheit.setup;
                            }
                        }
                    }
                }
            } // Ende der j-Schleife (Einheiten im Slot)
        } // Ende der i-Schleife (Slots auf dem Feld)
    } // Ende der r-Schleife (Gute/Böse Richtungen)
} // Ende der Funktion bewegeEinheiten

//Angreifen
function angriff(angreifer, zielSlotIndex) {
    // 1. Cooldown Check
    if (angreifer.cooldown > 0) {
        angreifer.cooldown--;
        return;
    }

    // Wir bestimmen die Richtung (Gute schlagen nach rechts +, Böse nach links -)
    let richtung = angreifer.seite === 'gut' ? 1 : -1;

    // 2. AoE-TIEFE Schleife (Felder durchgehen)
    for (let t = 0; t < angreifer.aoeTief; t++) {
        let aktuellerSlotIndex = zielSlotIndex + (t * richtung);

        // Prüfen, ob das Feld überhaupt noch auf dem Schlachtfeld liegt
        if (aktuellerSlotIndex >= 0 && aktuellerSlotIndex < feldLaenge) {
            let slot = schlachtfeld[aktuellerSlotIndex];

            // 3. AoE-BREITE Schleife (Gegner im Slot durchgehen)
            // Wir treffen maximal so viele, wie aoeBreit erlaubt
            let trefferZaehler = 0;
            
            // Wir loopen rückwärts durch den Slot, damit Splicing keine Fehler macht
            for (let e = slot.length - 1; e >= 0; e--) {
                let opfer = slot[e];

                // Nur Gegner treffen!
                if (opfer.seite !== angreifer.seite) {
                    opfer.hp -= angreifer.schaden;
                    trefferZaehler++;

                    // Prüfen, ob das Opfer stirbt
                    if (opfer.hp <= 0) {
                        slot.splice(e, 1);
                        console.log("Ein Gegner wurde vernichtet!");
                    }

                    // Wenn maximale Breite erreicht, im Slot aufhören
                    if (trefferZaehler >= angreifer.aoeBreit) break;
                }
            }
        }
    }

    // 4. Cooldown nach dem (Flächen-)Angriff setzen
    angreifer.cooldown = angreifer.as;
}

//Muss am Ende bleiben!
aktualisiereButtonTexte()
