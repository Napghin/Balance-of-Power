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

// 2. AKTUELLE RUNDE & PRODUKTION PROGRESS
let rundeErtrag = {
    hoffnung: 0,
    blut: 0
};

// NEU: Hier wird der aktuelle Fortschritt ("Brutzeit") der Einheiten gespeichert
let produktionProgress = {
    ritter: 0,
    bogenschuetze: 0,
    skelett: 0
};

// 3. BASIS-DATEN
let daten = {
    gut: { 
        res: 100, 
        hp: 100,      
        maxHp: 100,
        // NEU: Anzahl der gebauten Kasernen für das Licht
        kasernen: {
            ritter: 0,
            bogenschuetze: 0
        },
        aktuelleMasse: 0 // NEU: Für deine UI-Anzeige
    },
    boese: { 
        res: 100, 
        hp: 100,      
        maxHp: 100,
        // NEU: Anzahl der gebauten Kasernen für die Finsternis
        kasernen: {
            skelett: 0
        },
        aktuelleMasse: 0 // NEU: Für deine UI-Anzeige
    },
    balance: 50  
};

// 4. SCHLACHTFELD-STRUKTUR
let feldLaenge = 22;
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
    return { ...einheitenStats[name], maxHp: einheitenStats[name].hp }; 
}

const einheitenStats = {
    ritter: {
        typ: 'R',           // Das Symbol auf dem Spielfeld (Buchstabe)
        seite: 'gut',       // Bestimmt die Marschrichtung (gut = rechts, boese = links)
        kosten: 20,         // Wie viel Gold/Glaube beim Spawnen abgezogen wird
        hp: 20,             // Lebenspunkte (bei 0 wird die Einheit gelöscht)
        masse: 2,           // Gewicht für die Frontlinie (wichtig fürs spätere Schieben)
        schaden: 5,         // Wie viel HP dem Gegner pro Treffer abgezogen werden
        reichweite: 1,      // 1 = Nahkampf, 2+ = Fernkampf (Scan-Distanz in Feldern)
        as: 3,              // Attack Speed: Sekunden Pause zwischen Schlägen (HÖHER = LANGSAMER)
        cooldown: 0,        // Interner Zähler: Muss auf 0 sein, damit die Einheit zuschlägt
        setup: 0,           // Wartezeit nach jeder Bewegung, bevor Angriff möglich (Zielen)
        aoeBreit: 1,        // Wie viele Gegner IM selben Feld gleichzeitig getroffen werden
        aoeTief: 1,         // Wie viele Felder DAHINTER zusätzlich getroffen werden
        moveWait: 4,        // Lauf-Pause: Wie viele Sekunden pro Schritt gewartet wird (0 = jede Sek.)
        moveTimer: 0,       // Interner Zähler: Regelt die Lauf-Verzögerung
        crowdFactor: 2,     // Drängel-Strafe: Zusätzliche Sekunden-Pause beim Durchlaufen von Freunden
        auraDruck: 0,       // Wie stark die Einheit den "Balken" (Druck) in ihre Richtung schiebt
        position: 0,        // Startposition auf dem Array
	    einkommen: 0.5,	    // Erzeugtes Einkommen
	    metaWert: 2,	    //erzeugtes Blut/Hoffnung
        spawnRate: 0.05, // NEU: 0.05 bedeutet 5% pro Sekunde = 20 Sekunden für 1 Ritter
        beschreibung: "Baut eine Kaserne, die stetig schwere Nahkämpfer produziert."
    },
    bogenschuetze: {
        typ: 'B',           
        seite: 'gut',
        kosten: 50,         
        hp: 6,              
        masse: 1,
        schaden: 3,         
        reichweite: 4,      
        as: 1,              
        cooldown: 0,
        setup: 2,           
        aoeBreit: 1,
        aoeTief: 1,
        moveWait: 5,        
        moveTimer: 0,
        crowdFactor: 1,     
        auraDruck: 0,    
        position: 0,
	    einkommen: 0.5,
	    metaWert: 2,
        spawnRate: 0.03,
        beschreibung: "Errichtet einen Schießstand für Fernkämpfer."

    },
    skelett: {
        typ: 'S',
        seite: 'boese',
        kosten: 40,
        hp: 22,
        masse: 1,
        schaden: 6,
        reichweite: 1,
        as: 2,           
        cooldown: 0,     
        setup: 0,        
        aoeBreit: 1, 
        aoeTief: 1,      
        moveWait: 2, 
        moveTimer: 0,
        crowdFactor: 1,
        auraDruck: 0,
        position: feldLaenge - 1,
	    einkommen: 0.5,
	    metaWert: 2,
        spawnRate: 0.07,
        beschreibung: "Erweckt stetig billige Krieger aus dem verseuchten Boden."
    
    }

};

// 6. Produktionsebäude-Kauf Funktion / Spawn mechanic
function kaufeKaserne(name) {
    let stats = einheitenStats[name];
    let seite = stats.seite; 
    let konto = daten[seite];

    // Kosten bleiben gleich (Ritter Kaserne kostet so viel wie ein Ritter vorher)
    if (konto.res >= stats.kosten) {
        konto.res -= stats.kosten;
        
        // Kaserne im Inventar hochzählen
        konto.kasernen[name]++;
        
        updateUI();
    } else {
        console.log("Nicht genug Ressourcen für eine Kaserne!");
    }
}

// Hilfsfunktion: Wird von der Engine aufgerufen, wenn der Balken voll ist
function autoSpawnEinheit(name) {
    let stats = einheitenStats[name];
    let seite = stats.seite;
    let neueEinheit = erstelleEinheit(name);
    
    if (seite === 'gut') {
        schlachtfeld[0].push(neueEinheit);
    } else {
        schlachtfeld[feldLaenge - 1].push(neueEinheit);
    }
}

// START-ARMEE 
// Spawn 5 Ritter auf Feld 0 und 5 Skelette auf dem letzten Feld
for (let i = 0; i < 5; i++) {
    schlachtfeld[0].push(erstelleEinheit('ritter'));
    schlachtfeld[feldLaenge - 1].push(erstelleEinheit('skelett'));
}

// 7. SPIEL-MOTOR
setInterval(() => {
    // 1. BEWEGUNG, KAMPF & PHYSIK
    bewegeEinheiten();
    
    // 2. NEU: Kasernen ticken lassen und Einheiten im Hintergrund ausbrüten
    verarbeiteKasernenProduktion();
    
    // 3. Tote entfernen
    entferneToteEinheiten();

    // 4. Wirtschaft & Balance
    generiereEinkommen();
    berechneFrontlinie(); 
    updateUI();
    checkGameOver();
}, 1000);

// 8. FUNKTIONEN

/*
function kaufeArbeiter(seite) {
    let s = daten[seite];
    if (s.res >= s.kostenArbeiter) {
        s.res -= s.kostenArbeiter;
        s.arbeiter++;
        // Kosten steigen symmetrisch an
        s.kostenArbeiter = Math.round(s.kostenArbeiter * 1.2); 
        updateUI();
    }
}
*/

function updateUI() {
    // Ressourcen
    document.getElementById('res-gut').innerText = "Glaube: " + Math.floor(daten.gut.res) + " ✝️";
    document.getElementById('res-boese').innerText = "Furcht: " + Math.floor(daten.boese.res) + " 💀";

    // --- BALANCE-RUNEN & LICHT ---
    const fillGut = document.getElementById('balance-fill-gut');
    const fillBoese = document.getElementById('balance-fill-boese');

    if (fillGut && fillBoese) {
        fillGut.style.width = daten.balance + "%";
        fillBoese.style.width = (100 - daten.balance) + "%";

        let intensityFactor = daten.balance / 100;
        fillGut.style.setProperty('--intensity', intensityFactor.toFixed(2));

        let darknessFactor = 1 - (daten.balance / 100);
        fillBoese.style.setProperty('--darkness', darknessFactor.toFixed(2));
    } 

    // Run-Ertrag & Meta Anzeige
    document.getElementById('run-hoffnung').innerText = Math.floor(rundeErtrag.hoffnung);
    document.getElementById('run-blut').innerText = Math.floor(rundeErtrag.blut);
    document.getElementById('meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
    document.getElementById('meta-blut').innerText = metaProgress.blutGesamt;

    // SCHLACHTFELD Aktualisieren
    const display = document.getElementById('battle-display');
    display.innerHTML = ""; 

    for (let i = 0; i < feldLaenge; i++) {
        let slotDiv = document.createElement('div');
        slotDiv.className = 'slot';

        for (let ebene = 4; ebene >= 0; ebene--) {
            let punkt = document.createElement('div');
            punkt.className = 'einheit-punkt';
            
            // SICHERHEITS-CHECK gegen Abstürze!
            if (schlachtfeld[i] && schlachtfeld[i][ebene]) {
                let e = schlachtfeld[i][ebene];

                if (e.wurdeGetroffen) {
                    punkt.classList.add('hit-flash'); 
                    e.wurdeGetroffen = false; 
                }

                let aktuelleHp = (e.hp !== undefined) ? e.hp : 10;
                let maxHp = e.maxHp || 10; 
                let hpProzent = aktuelleHp / maxHp;
                if (isNaN(hpProzent) || hpProzent < 0) hpProzent = 0;
                punkt.style.opacity = Math.max(0.25, hpProzent);

                if (e.typ) {
                    punkt.innerText = e.typ.charAt(0).toUpperCase(); 
                } else {
                    punkt.innerText = "?";
                }
                punkt.style.color = (e.seite === 'gut') ? '#55aaff' : '#ff5555';
                punkt.style.fontWeight = "bold";

            } else {
                if (i === 0) {
                    punkt.innerText = "•"; 
                    punkt.style.color = "rgba(0, 116, 217, 0.7)"; 
                } else if (i === feldLaenge - 1) {
                    punkt.innerText = "•";
                    punkt.style.color = "rgba(255, 65, 54, 0.7)"; 
                } else {
                    punkt.innerText = ".";
                    punkt.style.color = "#444";
                }
            }
            slotDiv.appendChild(punkt);
        }
        display.appendChild(slotDiv);
    }

    // --- BUTTONS AUSGRAUEN ---
    let btnRitter = document.getElementById('btn-ritter');
    if (btnRitter) btnRitter.disabled = (daten.gut.res < einheitenStats.ritter.kosten);

    let btnSkelett = document.getElementById('btn-skelett');
    if (btnSkelett) btnSkelett.disabled = (daten.boese.res < einheitenStats.skelett.kosten);
    
    let btnBogen = document.getElementById('btn-bogenschuetze');
    if (btnBogen) btnBogen.disabled = (daten.gut.res < einheitenStats.bogenschuetze.kosten);

// BASIS-HP ANZEIGEN
    const visualBaseGut = document.querySelector('.base-gut');
    const visualBaseBoese = document.querySelector('.base-boese');
    if (visualBaseGut) visualBaseGut.innerText = daten.gut.hp + " / " + daten.gut.maxHp;
    if (visualBaseBoese) visualBaseBoese.innerText = daten.boese.hp + " / " + daten.boese.maxHp;

// --- Debug-Anzeigen ---
   
    if(document.getElementById('masse-gut')) {
    // Schreibt nur noch die nackte, auf eine Nachkommastelle gerundete Zahl in das Span
    document.getElementById('masse-gut').innerText = Number(daten.gut.aktuelleMasse).toFixed(1);
    }
    if(document.getElementById('masse-boese')) {
        document.getElementById('masse-boese').innerText = Number(daten.boese.aktuelleMasse).toFixed(1);
    }


// --- ANZEIGE FÜR BUTTONS (Kosten, Bestand, Progress) ---
    if(document.getElementById('txt-ritter')) {
        document.getElementById('txt-ritter').innerText = 
            `Ritter-Kaserne (${einheitenStats.ritter.kosten}) | Gebaut: ${daten.gut.kasernen.ritter} [${Math.floor(produktionProgress.ritter * 100)}%]`;
    }

    if(document.getElementById('txt-bogenschuetze')) {
        document.getElementById('txt-bogenschuetze').innerText = 
            `Bogen-Kaserne (${einheitenStats.bogenschuetze.kosten}) | Gebaut: ${daten.gut.kasernen.bogenschuetze} [${Math.floor(produktionProgress.bogenschuetze * 100)}%]`;
    }

    if(document.getElementById('txt-skelett')) {
        document.getElementById('txt-skelett').innerText = 
            `Skelett-Friedhof (${einheitenStats.skelett.kosten}) | Gebaut: ${daten.boese.kasernen.skelett} [${Math.floor(produktionProgress.skelett * 100)}%]`;
    }

// --- TOOLTIPS DYNAMISCH GENERIEREN (Lore + Stats) ---
    function generiereTooltip(stats) {
        // Die Rate in Prozent umrechnen (z.B. 0.05 -> 5)
        let prozentRate = Math.round(stats.spawnRate * 100);

        return `
            ${stats.beschreibung}
            <hr style="border: 1px solid #555; margin: 8px 0;">
            <span style="color: #ffaa00; line-height: 1.6; font-size: 0.95em;">
            <b>[ KAMPF ]</b><br>
            ⚔️ Schaden: <b>${stats.schaden}</b> | ⚡ Tempo: <b>${stats.as}s</b> | 🎯 Reichw.: <b>${stats.reichweite}</b><br>
            <b>[ TAKTIK ]</b><br>
            ⚖️ Masse: <b>${stats.masse}</b> | ⏳ Setup: <b>${stats.setup}s</b><br>
            <b>[ WIRTSCHAFT ]</b><br>
            💰 Einkommen: <b>+${stats.einkommen}/s</b><br>
            🏗️ Produktion: <b>+${prozentRate}%/s pro Gebäude</b>
            </span>`;
    }

    if(document.getElementById('tt-ritter')) {
        document.getElementById('tt-ritter').innerHTML = generiereTooltip(einheitenStats.ritter);
    }
    if(document.getElementById('tt-bogenschuetze')) {
        document.getElementById('tt-bogenschuetze').innerHTML = generiereTooltip(einheitenStats.bogenschuetze);
    }
    if(document.getElementById('tt-skelett')) {
        document.getElementById('tt-skelett').innerHTML = generiereTooltip(einheitenStats.skelett);
    }

}
// <-- HIER ENDET updateUI()


function aktualisiereButtonTexte() {
    // Wir sprechen nur die SPAN-IDs an, nicht die Button-IDs!
    
    if(document.getElementById('txt-ritter')) {
        document.getElementById('txt-ritter').innerText = 
            `Ritter entsenden (${einheitenStats.ritter.kosten})`;
    }

    if(document.getElementById('txt-skelett')) {
        document.getElementById('txt-skelett').innerText = 
            `Skelett beschwören (${einheitenStats.skelett.kosten})`;
    }

    if(document.getElementById('txt-bogenschuetze')) {
        document.getElementById('txt-bogenschuetze').innerText = 
            `Bogenschütze entsenden (${einheitenStats.bogenschuetze.kosten})`;
    }
}

function checkGameOver() {
    // NEU: Spiel endet, wenn eine der beiden Basen 0 HP erreicht
    if (daten.gut.hp <= 0 || daten.boese.hp <= 0) {
        
        // 1. Werte berechnen
        let gewonneneHoffnung = Math.floor(rundeErtrag.hoffnung || 0);
        let gewonnenesBlut = Math.floor(rundeErtrag.blut || 0);

        metaProgress.hoffnungGesamt += gewonneneHoffnung;
        metaProgress.blutGesamt += gewonnenesBlut;

        // 2. LocalStorage speichern (bleibt gleich)
        try {
            localStorage.setItem('hoffnungGesamt', metaProgress.hoffnungGesamt);
            localStorage.setItem('blutGesamt', metaProgress.blutGesamt);
        } catch (e) {
            console.warn("Speichern im LocalStorage fehlgeschlagen.", e);
        }

        // 3. Den Spieler informieren
        let sieger = daten.boese.hp <= 0 ? "DAS LICHT" : "DIE FINSTERNIS";
        alert("Run beendet! " + sieger + " hat die gegnerische Basis zerstört.\nErhaltene Hoffnung: " + gewonneneHoffnung + "\nErhaltenes Blut: " + gewonnenesBlut);
        
        // 4. Neustart
        location.reload();
    }
}

function bewegeEinheiten() {
    // 1. GLOBALE TIMER REDUZIEREN
    for (let i = 0; i < feldLaenge; i++) {
        for (let einheit of schlachtfeld[i]) {
            if (einheit.moveTimer > 0) einheit.moveTimer--;
        }
    }

    const richtungen = [
        { seite: 'gut', zielMod: 1, start: feldLaenge - 1, ende: 0, schritt: -1 },
        { seite: 'boese', zielMod: -1, start: 0, ende: feldLaenge - 1, schritt: 1 }
    ];

    const SCHUB_SCHWELLE = 1.33; 

    for (let r of richtungen) {
        for (let i = r.start; r.schritt === -1 ? i >= r.ende : i <= r.ende; i += r.schritt) {
            for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
                let einheit = schlachtfeld[i][j];
                
                if (einheit.seite !== r.seite) continue;

                // --- 2. KAMPF-SCAN (IMMER ausführen, auch wenn die Beine müde sind!) ---
                let gegnerGefunden = false;
                let gegnerSlotIndex = -1;
                for (let dist = 0; dist <= einheit.reichweite; dist++) {
                    let checkIdx = i + (dist * r.zielMod);
                    if (checkIdx >= 0 && checkIdx < feldLaenge && 
                        schlachtfeld[checkIdx].some(e => e.seite !== einheit.seite && e.hp > 0)) {
                        gegnerGefunden = true;
                        gegnerSlotIndex = checkIdx;
                        break;
                    }
                }

                if (gegnerGefunden) {
                    angriff(einheit, gegnerSlotIndex);
                } else {
                    let distZurBasis = (einheit.seite === 'gut') ? ((feldLaenge - 1) - i) : (i - 0);
                    if (distZurBasis <= einheit.reichweite) {
                        // Basis-Angriff braucht auch den Cooldown, sonst greifen sie jede Sekunde an
                        if (einheit.cooldown > 0) {
                            einheit.cooldown--;
                        } else {
                            if (einheit.seite === 'gut') daten.boese.hp -= einheit.schaden;
                            else daten.gut.hp -= einheit.schaden;
                            einheit.cooldown = einheit.as;
                        }
                        continue; // Wer die Basis haut, läuft nicht weiter rein
                    }
                }

                // --- 3. BEWEGUNG & PHYSIK (NUR ausführen, wenn moveTimer == 0) ---
                if (einheit.moveTimer > 0) continue; 

                let zielIdx = i + r.zielMod;
                
                if (zielIdx >= 1 && zielIdx <= feldLaenge - 2) {
                    let zielSlot = schlachtfeld[zielIdx];
                    let feindImZiel = zielSlot.some(e => e.seite !== einheit.seite && e.hp > 0);

                    if (feindImZiel) {
                        // Masse mit Tiefen-Staffelung
                        let masseEigene = 0;
                        let eigeneReihen = [
                            { idx: i, faktor: 1.0 },
                            { idx: i - r.zielMod, faktor: 0.5 },
                            { idx: i - (r.zielMod * 2), faktor: 0.25 }
                        ];
                        for (let reihe of eigeneReihen) {
                            if (reihe.idx >= 0 && reihe.idx < feldLaenge) {
                                masseEigene += schlachtfeld[reihe.idx]
                                    .filter(e => e.seite === einheit.seite && e.hp > 0)
                                    .reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
                            }
                        }

                        let masseFeind = 0;
                        let feindReihen = [
                            { idx: zielIdx, faktor: 1.0 },
                            { idx: zielIdx + r.zielMod, faktor: 0.5 },
                            { idx: zielIdx + (r.zielMod * 2), faktor: 0.25 }
                        ];
                        for (let reihe of feindReihen) {
                            if (reihe.idx >= 0 && reihe.idx < feldLaenge) {
                                masseFeind += schlachtfeld[reihe.idx]
                                    .filter(e => e.seite !== einheit.seite && e.hp > 0)
                                    .reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
                            }
                        }
                        
                        if (masseEigene >= (masseFeind * SCHUB_SCHWELLE)) {
                            dominoSchieben(zielIdx, r.zielMod);
                            schlachtfeld[i].splice(j, 1);
                            zielSlot.push(einheit);
                            einheit.moveTimer = (einheit.moveWait || 2);
                        } else {
                            einheit.moveTimer = 1; 
                        }
                    } else if (zielSlot.length < 5) {
                        schlachtfeld[i].splice(j, 1);
                        zielSlot.push(einheit);
                        einheit.moveTimer = (einheit.moveWait || 2);
                    }
                }
            }
        }
    }
}


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

              // Nur Gegner treffen, die auch am Leben sind
                if (opfer.seite !== angreifer.seite && opfer.hp > 0) {
                    opfer.hp -= angreifer.schaden;
                    
                    // Feedback für den Spieler
                    opfer.wurdeGetroffen = true; 
                    zeigeSchaden(angreifer.schaden, aktuellerSlotIndex, angreifer.seite, e);
                    
                    trefferZaehler++;

                    // DAS HIER WURDE GEÄNDERT:
                    // Wir prüfen zwar, ob er stirbt (für Logs etc.), 
                    // aber wir löschen ihn NICHT mehr mit splice!
                    if (opfer.hp <= 0) {
                        // console.log("Einheit hat den tödlichen Schlag kassiert, wehrt sich aber noch!");
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

function zeigeSchaden(schaden, slotIndex, angreiferSeite, ebene) {
    const display = document.getElementById('battle-display');
    const wrapper = document.querySelector('.battle-wrapper');
    if (!display || !wrapper) return;
    
    const slots = display.getElementsByClassName('slot');
    const zielSlot = slots[slotIndex];
    if (!zielSlot) return; 

    const rect = zielSlot.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    const flText = document.createElement('div');
    flText.innerText = "-" + Math.floor(schaden);
    flText.className = 'schaden-text';
    
    if (angreiferSeite === 'gut') {
        flText.style.color = "#ffffff";
        flText.style.textShadow = "0px 0px 8px #55aaff, 2px 2px 0px black";
    } else {
        flText.style.color = "#ffffff";
        flText.style.textShadow = "0px 0px 8px #ff5555, 2px 2px 0px black";
    }

    flText.style.position = 'absolute';
    
    // --- NEU: ZUFÄLLIGE STREUUNG (Scatter) ---
    // Erzeugt einen Wert zwischen -15 und +15 Pixeln
    let randomX = Math.floor(Math.random() * 30) - 15; 
    let randomY = Math.floor(Math.random() * 30) - 15;

    flText.style.left = (rect.left - wrapperRect.left + (rect.width / 2) - 10 + randomX) + 'px'; 

    let ebenenOffset = (ebene !== undefined) ? (ebene * 24) : 48; 
    
    // Die Streuung auch auf die Höhe anrechnen
    flText.style.top = (rect.bottom - wrapperRect.top - ebenenOffset - 35 + randomY) + 'px'; 

    wrapper.appendChild(flText);

    setTimeout(() => {
        if(flText.parentNode) flText.parentNode.removeChild(flText);
    }, 1000);
}

function entferneToteEinheiten() {
    for (let i = 0; i < feldLaenge; i++) {
        for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
            let opfer = schlachtfeld[i][j];
            
            if (opfer.hp <= 0) {
                // --- META-RESSOURCEN DURCH KILLS ---
                // Wir lesen den Wert aus. Falls du bei einer Einheit vergessen hast, 
                // den metaWert einzutragen, nimmt das Spiel sicherheitshalber 1.
                let wertung = opfer.metaWert || 1; 

                if (opfer.seite === 'boese') {
                    // Ein Böser stirbt -> Hoffnung steigt um seinen Wert
                    rundeErtrag.hoffnung += wertung; 
                } else {
                    // Ein Guter stirbt -> Blut steigt um seinen Wert
                    rundeErtrag.blut += wertung; 
                }
                
                // Einheit vom Feld nehmen
                schlachtfeld[i].splice(j, 1);
            }
        }
    }
}

function generiereEinkommen() {
    let einkommenGut = 2;
    let einkommenBoese = 2;

    // Wir scannen das Schlachtfeld  für das Bonuseinkommen
    for (let i = 0; i < feldLaenge; i++) {
        for (let j = 0; j < schlachtfeld[i].length; j++) {
            let e = schlachtfeld[i][j];

            if (e.seite === 'gut') {
                // Liest den Wert aus dem Katalog (z.B. ritter.einkommen). Wenn keiner da ist, standardmäßig 1.
                einkommenGut += (e.einkommen || 1); 
            } else {
                einkommenBoese += (e.einkommen || 1);
            }
        }
    }

    // Ressourcen gutschreiben
    daten.gut.res += einkommenGut;
    daten.boese.res += einkommenBoese;

    // NEU: Die Werte in deine neuen HTML-Anzeigen schreiben
    const genGutAnzeige = document.getElementById('gen-gut');
    const genBoeseAnzeige = document.getElementById('gen-boese');
    if (genGutAnzeige) genGutAnzeige.innerText = einkommenGut;
    if (genBoeseAnzeige) genBoeseAnzeige.innerText = einkommenBoese;
}

function berechneFrontlinie() {
    let maxGut = 0; 
    let minBoese = feldLaenge - 1; 
    
    let auraDruckGut = 0;
    let auraDruckBoese = 0;

    // 1. Zuerst die absolute Frontlinie ermitteln
    for (let i = 0; i < feldLaenge; i++) {
        for (let j = 0; j < schlachtfeld[i].length; j++) {
            let e = schlachtfeld[i][j];
            if (e.seite === 'gut') {
                if (i > maxGut) maxGut = i;
                auraDruckGut += (e.auraDruck || 0);
            } else {
                if (i < minBoese) minBoese = i;
                auraDruckBoese += (e.auraDruck || 0);
            }
        }
    }

    // 2. Taktischen Front-Druck (Masse) berechnen (100% / 50% / 25%)
    let frontMasseGut = 0;
    let frontMasseBoese = 0;

    // Eigene Reihen (Gut drückt nach rechts)
    let reihenGut = [
        { idx: maxGut, faktor: 1.0 },
        { idx: maxGut - 1, faktor: 0.5 },
        { idx: maxGut - 2, faktor: 0.25 }
    ];
    for (let r of reihenGut) {
        if (r.idx >= 0 && r.idx < feldLaenge) {
            frontMasseGut += schlachtfeld[r.idx]
                .filter(e => e.seite === 'gut' && e.hp > 0)
                .reduce((sum, e) => sum + (e.masse || 1), 0) * r.faktor;
        }
    }

    // Feindliche Reihen (Böse drückt nach links)
    let reihenBoese = [
        { idx: minBoese, faktor: 1.0 },
        { idx: minBoese + 1, faktor: 0.5 },
        { idx: minBoese + 2, faktor: 0.25 }
    ];
    for (let r of reihenBoese) {
        if (r.idx >= 0 && r.idx < feldLaenge) {
            frontMasseBoese += schlachtfeld[r.idx]
                .filter(e => e.seite === 'boese' && e.hp > 0)
                .reduce((sum, e) => sum + (e.masse || 1), 0) * r.faktor;
        }
    }

    // Werte speichern (fürs UI)
    daten.gut.aktuelleMasse = frontMasseGut;
    daten.boese.aktuelleMasse = frontMasseBoese;

    // 3. Balance-Berechnung für den Runen-Balken (wie bisher)
    let frontMitte = (maxGut + minBoese) / 2;
    let auraVerschiebung = auraDruckGut - auraDruckBoese;
    frontMitte += auraVerschiebung;
    
    let neueBalance = (frontMitte / (feldLaenge - 1)) * 100;
    daten.balance = Math.max(0, Math.min(100, neueBalance)); 
}


// Hilfsfunktion: Schiebt eine Kette von Gegnern weg
function dominoSchieben(idx, richtung) {
    let zielIdx = idx + richtung;
    if (zielIdx < 0 || zielIdx >= feldLaenge) return; // In Basis zerquetschen

    // Schiebe alle Einheiten im aktuellen Slot einen weiter
    let einheiten = schlachtfeld[idx].splice(0);
    
    // Domino: Wenn der Ziel-Slot voll ist, schiebe die dortigen Einheiten weiter
    if (schlachtfeld[zielIdx].length > 0) {
        dominoSchieben(zielIdx, richtung);
    }
    
    // Einheiten in den neuen Slot schieben
    schlachtfeld[zielIdx].push(...einheiten);
    
    // Prüfe auf "Zerquetschen" (Basis-Check)
    einheiten.forEach(e => {
        if (zielIdx === 0 || zielIdx === feldLaenge - 1) e.hp = 0;
    });
}

function verarbeiteKasernenProduktion() {
    // 1. RITTER (GUT)
    if (daten.gut.kasernen.ritter > 0) {
        // Wir holen die Rate aus dem Katalog (Fallback ist 0.1, falls du es mal vergisst einzutragen)
        let rate = einheitenStats.ritter.spawnRate || 0.1; 
        produktionProgress.ritter += daten.gut.kasernen.ritter * rate;
        
        if (produktionProgress.ritter >= 1.0) {
            autoSpawnEinheit('ritter');
            produktionProgress.ritter -= 1.0; 
        }
    }

    // 2. BOGENSCHUETZE (GUT)
    if (daten.gut.kasernen.bogenschuetze > 0) {
        let rate = einheitenStats.bogenschuetze.spawnRate || 0.1;
        produktionProgress.bogenschuetze += daten.gut.kasernen.bogenschuetze * rate;
        
        if (produktionProgress.bogenschuetze >= 1.0) {
            autoSpawnEinheit('bogenschuetze');
            produktionProgress.bogenschuetze -= 1.0;
        }
    }

    // 3. SKELETT (BÖSE)
    if (daten.boese.kasernen.skelett > 0) {
        let rate = einheitenStats.skelett.spawnRate || 0.1;
        produktionProgress.skelett += daten.boese.kasernen.skelett * rate;
        
        if (produktionProgress.skelett >= 1.0) {
            autoSpawnEinheit('skelett');
            produktionProgress.skelett -= 1.0;
        }
    }
}

//Muss am Ende bleiben!
aktualisiereButtonTexte()
