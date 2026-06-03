// ==========================================
// 1. PERMANENTER SPEICHER (Meta-Fortschritt)
// ==========================================
let metaProgress = {
    hoffnungGesamt: 0,
    blutGesamt: 0
};
let spielPausiert = false;

// Hier speichern wir, ob ein Knoten gekauft ist (true) oder nicht (false)
let gekaufteKnoten = {
    // Mitte (Neutral)
    'node-mitte-1': false, 'node-mitte-2': false, 'node-mitte-3': false,
    'node-mitte-4': false, 'node-mitte-5': false, 'node-mitte-6': false,
    'node-mitte-7': false, 'node-mitte-8': false, 'node-mitte-sq-1': false,

    // Blau (Hoffnung)
    'node-blau-1': false, 'node-blau-2': false, 'node-blau-3': false,
    'node-blau-4': false, 'node-blau-5': false, 'node-blau-6': false,
    'node-blau-7': false, 'node-blau-8': false, 'node-blau-9': false,
    'node-blau-sq-1': false, 'node-blau-sq-2': false,

    // Rot (Blut)
    'node-rot-1': false, 'node-rot-2': false, 'node-rot-3': false,
    'node-rot-4': false, 'node-rot-5': false, 'node-rot-6': false,
    'node-rot-7': false, 'node-rot-8': false, 'node-rot-9': false,
    'node-rot-sq-1': false, 'node-rot-sq-2': false
};

// ==========================================
// META-BUFFS (Aktive Boni aus dem Shop)
// ==========================================
let metaBuffs = {
    hoffnungMulti: 1.0, // 1.0 = 100% (Normalwert)
    blutMulti: 1.0      // 1.0 = 100% (Normalwert)
};

// Diese Funktion liest den Skilltree aus und berechnet alle aktuellen Boni
function berechneMetaBuffs() {
    metaBuffs.hoffnungMulti = 1.0;
    metaBuffs.blutMulti = 1.0;

    if (gekaufteKnoten['node-mitte-1'] === true) {
        metaBuffs.hoffnungMulti += 0.5; // +50% Hoffnung
        metaBuffs.blutMulti += 0.5;     // +50% Blut
    }
}

// DATEN LADEN
try {
    let h = localStorage.getItem('hoffnungGesamt');
    let b = localStorage.getItem('blutGesamt');
    let gespeicherteKnoten = localStorage.getItem('gekaufteKnoten');
    
    if (h) metaProgress.hoffnungGesamt = parseInt(h) || 0;
    if (b) metaProgress.blutGesamt = parseInt(b) || 0;
    
    if (gespeicherteKnoten) {
        let geladeneKnoten = JSON.parse(gespeicherteKnoten);
        Object.assign(gekaufteKnoten, geladeneKnoten);
    }
} catch (e) {
    console.error("Speicher-Fehler ignoriert.");
}

// BUFFS AKTIVIEREN
berechneMetaBuffs();

// SPEICHERN
function speichereMeta() {
    localStorage.setItem('hoffnungGesamt', metaProgress.hoffnungGesamt);
    localStorage.setItem('blutGesamt', metaProgress.blutGesamt);
    localStorage.setItem('gekaufteKnoten', JSON.stringify(gekaufteKnoten));
}

// ==========================================
// 2. SPIELDATEN & WIRTSCHAFT
// ==========================================
let rundeErtrag = {
    hoffnung: 0,
    blut: 0
};

let produktionProgress = {
    ritter: 0, bogenschuetze: 0, priester: 0, kavallerie: 0, lanzentraeger: 0, artillerie: 0, 
    skelett: 0, oger: 0, hexer: 0, daemon: 0, assasine: 0, werwolf: 0                    
};

let daten = {
    gut: { 
        res: 100, hp: 100, maxHp: 100,
        kasernen: { ritter: 0, bogenschuetze: 0, priester: 0, kavallerie: 0, lanzentraeger: 0, artillerie: 0 },
        aktuelleMasse: 0, momentum: 0, metaBuff: 0
    },
    boese: { 
        res: 100, hp: 100, maxHp: 100,
        kasernen: { skelett: 0, oger: 0, hexer: 0, daemon: 0, assasine: 0, werwolf: 0},
        aktuelleMasse: 0, momentum: 0, metaBuff: 0
    },
    balance: 50, lastBalance: 50
};



// ==========================================
// 3. SCHLACHTFELD-STRUKTUR
// ==========================================
let feldLaenge = 16;        // Kürzere Distanz zwischen den Basen
let maxSlotVolumen = 8;     // DEINE NEUE BREITE! (Wie viele Einheiten übereinander passen)
let schlachtfeld = [];

for (let i = 0; i < feldLaenge; i++) {
    schlachtfeld.push([]); 
}

// ==========================================
// 4. EINHEITEN-KATALOG
// ==========================================
function erstelleEinheit(name) {
    return { ...einheitenStats[name], maxHp: einheitenStats[name].hp }; 
}

const einheitenStats = {
    ritter: {
        typ: 'R', seite: 'gut', kosten: 40, hp: 14, masse: 2, volumen: 1,
        schaden: 7, reichweite: 1, as: 3, critChance: 0.1, critMult: 2.0,
        cooldown: 0, setup: 0, aoeBreit: 1, aoeTief: 1, moveWait: 4, moveTimer: 0,
        crowdFactor: 2, auraDruck: 0, position: 0, einkommen: 0.5, metaWert: 2,
        spawnRate: 0.03, belagerung: 2,
	gebaeudeName: "Ritterburg",
        beschreibung: "Baut eine Kaserne, die stetig schwere Nahkämpfer produziert."
    },
    bogenschuetze: {
        typ: 'B', seite: 'gut', kosten: 50, hp: 6, masse: 1, volumen: 1, 
        schaden: 0, reichweite: 4, as: 1.5, critChance: 0.15, critMult: 1.5,
        cooldown: 0, setup: 2, aoeBreit: 1, aoeTief: 1, moveWait: 5, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: 0, einkommen: 0.25, metaWert: 2,
        spawnRate: 0.025, belagerung: 1,
	gebaeudeName: "Schießstand",
        beschreibung: "Errichtet einen Schießstand für Fernkämpfer."
    },
    priester: {
        typ: 'P', seite: 'gut', kosten: 80, hp: 10, masse: 1, volumen: 1,          
        schaden: 0, heilung: 3, reichweite: 3, as: 3, critChance: 0.10, critMult: 1.5,           
        cooldown: 0, setup: 1, aoeBreit: 5, aoeTief: 1, moveWait: 3, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: 0, einkommen: 0.3, metaWert: 3, 
        spawnRate: 0.015, belagerung: 0,
	gebaeudeName: "Kloster",    
        beschreibung: "Nutzt göttliche Magie, um Verbündete an der Front zu heilen."
    },
	kavallerie: {
        typ: 'K', seite: 'gut', kosten: 150, hp: 40, masse: 4, volumen: 2, 
        schaden: 12, reichweite: 1, as: 2.5, critChance: 0.15, critMult: 2.0,
        cooldown: 0, setup: 1, aoeBreit: 2, aoeTief: 1, moveWait: 2, moveTimer: 0, // moveWait 2 = sehr schnell
        crowdFactor: 2, auraDruck: 1, position: 0, einkommen: 1.0, metaWert: 4,
        spawnRate: 0.02, belagerung: 3,
        gebaeudeName: "Stall",
        beschreibung: "Schwere Kavallerie. Extrem schnell, drückt die Front massiv nach vorn."
    },
    lanzentraeger: {
        typ: 'L', seite: 'gut', kosten: 60, hp: 12, masse: 2, volumen: 1, 
        schaden: 7, reichweite: 2, as: 5, critChance: 0.1, critMult: 2.0, // Reichweite 2!
        cooldown: 0, setup: 0, aoeBreit: 1, aoeTief: 2, moveWait: 4, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: 0, einkommen: 0.4, metaWert: 2,
        spawnRate: 0.015, belagerung: 1, // Langsamerer Spawn als Ritter (0.015 statt 0.03)
        gebaeudeName: "Kaserne",
        beschreibung: "Nahkämpfer mit Piken. Können sicher aus der zweiten Reihe angreifen."
    },
    artillerie: {
        typ: 'A', seite: 'gut', kosten: 250, hp: 20, masse: 4, volumen: 3, 
        schaden: 18, reichweite: 5, as: 6, critChance: 0.1, critMult: 2.0, // Hohe RW, langsamer AS
        cooldown: 0, setup: 3, aoeBreit: 3, aoeTief: 3, moveWait: 6, moveTimer: 0, // Massive AoE
        crowdFactor: 1, auraDruck: 1, position: 0, einkommen: 0, metaWert: 5,
        spawnRate: 0.01, belagerung: 10,
        gebaeudeName: "Belagerungswerkstatt",
        beschreibung: "Sperrig und langsam, aber schießt massive AoE-Geschosse über das halbe Feld."
    },
    skelett: {
        typ: 'S', seite: 'boese', kosten: 40, hp: 13, masse: 1, volumen: 1, 
        schaden: 5, reichweite: 1, as: 2, critChance: 0.05, critMult: 2.0,        
        cooldown: 0, setup: 0, aoeBreit: 1, aoeTief: 1, moveWait: 2, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: feldLaenge - 1, einkommen: 0.5,
        metaWert: 2, spawnRate: 0.05, belagerung: 2,
	gebaeudeName: "Skelett-Friedhof",
        beschreibung: "Erweckt stetig billige Krieger aus dem verseuchten Boden."
    },
    oger: {
        typ: 'O', seite: 'boese', kosten: 100, hp: 100, masse: 15, volumen: 3,          
        schaden: 0, reichweite: 1, as: 4, critChance: 0.05, critMult: 3.0,           
        cooldown: 0, setup: 1, aoeBreit: 3, aoeTief: 1, moveWait: 5, moveTimer: 0,
        crowdFactor: 2, auraDruck: 0, position: feldLaenge - 1, einkommen: 2,
        metaWert: 5, spawnRate: 0.01, belagerung: 7,   
	gebaeudeName: "Oger-Höhle", 
        beschreibung: "Beschwört einen gigantischen Titanen, der enorm viel Masse und Platz beansprucht."
    },
    hexer: {
        typ: 'H', seite: 'boese', kosten: 120, hp: 8, masse: 1, volumen: 1,          
        schaden: 0, reichweite: 4, as: 3, critChance: 0.15, critMult: 1.5,            
        cooldown: 0, setup: 1, aoeBreit: 1, aoeTief: 1, moveWait: 4, moveTimer: 0, // AoE passen wir später per Code an!
        crowdFactor: 1, auraDruck: 0, position: feldLaenge - 1, einkommen: 0.5, metaWert: 4, 
        spawnRate: 0.02, belagerung: 2,
        gebaeudeName: "Hexenturm",    
        beschreibung: "Schießt Chaosblitze, die 3-5 zufällige Ziele gleichzeitig treffen."
    },
    daemon: {
        typ: 'D', seite: 'boese', kosten: 450, hp: 180, masse: 15, volumen: 5, // Volumen 5!         
        schaden: 20, reichweite: 2, as: 2.0, critChance: 0.20, critMult: 2.0, // Schneller AS (2.0)           
        cooldown: 0, setup: 2, aoeBreit: 3, aoeTief: 3, moveWait: 4, moveTimer: 0, 
        crowdFactor: 4, auraDruck: 4, position: feldLaenge - 1, einkommen: 0, metaWert: 10, 
        spawnRate: 0.005, belagerung: 15,   
        gebaeudeName: "Höllentor", 
        beschreibung: "Ein gigantischer Erzdämon, der unfassbar schnell massiven Flächenschaden austeilt."
    },
    assasine: {
        typ: 'A', seite: 'boese', kosten: 80, hp: 4, masse: 1, volumen: 1,          
        schaden: 10, reichweite: 1, as: 1.5, critChance: 0.15, critMult: 2.0, // Hoher Schaden & Crit           
        cooldown: 0, setup: 0, aoeBreit: 1, aoeTief: 1, moveWait: 1, moveTimer: 0, // Sehr schnell (moveWait 1)
        crowdFactor: 1, auraDruck: -1, position: feldLaenge - 1, einkommen: 1.0, metaWert: 3, 
        spawnRate: 0.03, belagerung: 0,   
        gebaeudeName: "Assasinenversteck",
	stealth: true, 
        beschreibung: "Schleicht sich an der Front vorbei und meuchelt schwache Ziele im Hinterland."
    },
    werwolf: {
        typ: 'W', seite: 'boese', kosten: 110, hp: 28, masse: 2, volumen: 1, 
        schaden: 9, reichweite: 2, as: 2.0, critChance: 0.15, critMult: 1.5,
        cooldown: 0, setup: 0, aoeBreit: 2, aoeTief: 1, moveWait: 2, moveTimer: 0,
        crowdFactor: 1, auraDruck: 1, position: feldLaenge - 1, einkommen: 0.5, metaWert: 3,
        spawnRate: 0.02, belagerung: 1,
        gebaeudeName: "Wolfshöhle",
        beschreibung: "Blutrünstige Bestie. Heilt sich bei jedem Treffer um 1 HP."
    }
};

// ==========================================
// 5. PRODUKTIONS-LOGIK
// ==========================================
function getKosten(name) {
    let stats = einheitenStats[name];
    let gebaut = daten[stats.seite].kasernen[name];
    return Math.floor(stats.kosten * Math.pow(1.1, gebaut)); 
}

function kaufeKaserne(name) {
    let stats = einheitenStats[name];
    let seite = stats.seite; 
    let konto = daten[seite];
    let aktuelleKosten = getKosten(name); 

    if (konto.res >= aktuelleKosten) {
        konto.res -= aktuelleKosten;
        konto.kasernen[name]++;
        updateUI(); // Das reicht jetzt völlig aus!
    } else {
        console.log("Nicht genug Ressourcen für eine Kaserne!");
    }
}

function autoSpawnEinheit(name) {
    let stats = einheitenStats[name];
    let seite = stats.seite;
    let slotIdx = (seite === 'gut') ? 0 : feldLaenge - 1;

    let benoetigtesVolumen = stats.volumen || 1;
    if (getSlotVolumen(schlachtfeld[slotIdx]) + benoetigtesVolumen > maxSlotVolumen) {
        return false; 
    }

    let neueEinheit = erstelleEinheit(name);
    schlachtfeld[slotIdx].push(neueEinheit);
    return true; 
}

function verarbeiteKasernenProduktion() {
    let units = ['ritter', 'bogenschuetze', 'priester', 'kavallerie', 'lanzentraeger', 'artillerie', 'skelett', 'oger', 'hexer', 'daemon', 'assasine', 'werwolf'];
    
    for (let u of units) {
        let stats = einheitenStats[u];
        let anzahl = daten[stats.seite].kasernen[u];
        
        if (anzahl > 0) {
            let spawnMulti = daten[stats.seite].momentum === 4 ? 1.1 : 1.0; 
            let rate = (stats.spawnRate || 0.1) * spawnMulti;
            produktionProgress[u] += anzahl * rate;
            
            while (produktionProgress[u] >= 1.0) {
                if (autoSpawnEinheit(u)) produktionProgress[u] -= 1.0; 
                else break; 
            }
        }
    }
}

// ==========================================
// START-ARMEE (Zum Testen & Balancen)
// ==========================================
// Hier kannst du die Anzahl der Start-Einheiten bequem einstellen:
let startRitter = 0;
let startBogenschuetzen = 8;


let startSkelette = 0;
let startOger = 2;
let startHexer = 0;

// --- Spawn für "Die Guten" (Ganz links: Slot 0) ---
for (let i = 0; i < startRitter; i++) {
    schlachtfeld[0].push(erstelleEinheit('ritter'));
}
for (let i = 0; i < startBogenschuetzen; i++) {
    schlachtfeld[0].push(erstelleEinheit('bogenschuetze'));
}

// --- Spawn für "Die Bösen" (Ganz rechts: Slot feldLaenge - 1) ---
for (let i = 0; i < startSkelette; i++) {
    schlachtfeld[feldLaenge - 1].push(erstelleEinheit('skelett'));
}
for (let i = 0; i < startOger; i++) {
    schlachtfeld[feldLaenge - 1].push(erstelleEinheit('oger'));
}
for (let i = 0; i < startHexer; i++) {
    schlachtfeld[feldLaenge - 1].push(erstelleEinheit('hexer'));
}

// ==========================================
// 6. KAMPF, BEWEGUNG & HEILUNG
// ==========================================
function bewegeEinheiten() {
    // 1. Cooldowns & Timer für alle reduzieren
    for (let i = 0; i < feldLaenge; i++) {
        for (let einheit of schlachtfeld[i]) {
            let mom = daten[einheit.seite].momentum;
            let tempoBonus = mom >= 3 ? (mom - 2) * 0.1 : 0; 
            
            if (einheit.moveTimer > 0) einheit.moveTimer -= (1 + tempoBonus);
            if (einheit.cooldown > 0) einheit.cooldown -= (1 + tempoBonus);
            einheit.hatAktionGemacht = false; 
        }
    }

    const richtungen = [
        { seite: 'gut', zielMod: 1, start: feldLaenge - 1, ende: 0, schritt: -1 },
        { seite: 'boese', zielMod: -1, start: 0, ende: feldLaenge - 1, schritt: 1 }
    ];
    const SCHUB_SCHWELLE = 1.33; 

    // ==========================================
    // PHASE 1: KAMPF & HEILUNG
    // ==========================================
    for (let r of richtungen) {
        for (let i = r.start; r.schritt === -1 ? i >= r.ende : i <= r.ende; i += r.schritt) {
            for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
                let einheit = schlachtfeld[i][j];
                if (einheit.seite !== r.seite) continue;

                if (einheit.heilung && einheit.heilung > 0) {
                    let heilSlotIndex = -1;
                    for (let dist = 0; dist <= einheit.reichweite; dist++) {
                        let checkIdx = i + (dist * r.zielMod);
                        if (checkIdx >= 0 && checkIdx < feldLaenge) {
                            if (schlachtfeld[checkIdx].some(e => e.seite === einheit.seite && e.hp > 0 && e.hp < (e.maxHp || 10))) {
                                heilSlotIndex = checkIdx; break;
                            }
                        }
                    }

                    if (heilSlotIndex !== -1) {
                        heileVerbuedete(einheit, heilSlotIndex);
                        einheit.hatAktionGemacht = true; 
                    } else {
                        let feindInSicht = false;
                        for (let dist = 1; dist <= einheit.reichweite; dist++) {
                            let checkIdx = i + (dist * r.zielMod);
                            if (checkIdx >= 0 && checkIdx < feldLaenge && schlachtfeld[checkIdx].some(e => e.seite !== einheit.seite && e.hp > 0 && !e.stealth)) {
                                feindInSicht = true; break;
                            }
                        }
                        if (feindInSicht) {
                            einheit.moveTimer = 1; 
                            einheit.hatAktionGemacht = true; 
                        }
                    }
                } else {
                    let gegnerSlotIndex = -1;
                    for (let dist = 0; dist <= einheit.reichweite; dist++) {
                        let checkIdx = i + (dist * r.zielMod);
                        if (checkIdx >= 0 && checkIdx < feldLaenge && schlachtfeld[checkIdx].some(e => e.seite !== einheit.seite && e.hp > 0 && !e.stealth)) {
                            gegnerSlotIndex = checkIdx; break;
                        }
                    }

                    if (gegnerSlotIndex !== -1) {
                        let willAngreifen = true;
                        
                        if (einheit.stealth) {
                            let distZurFront = (einheit.seite === 'boese') ? (daten.frontGut - i) : (i - daten.frontBoese);
                            let tiefereFeinde = false;
                            for(let step = 1; step <= 2; step++) {
                                let deepIdx = i + (step * r.zielMod);
                                if (deepIdx >= 0 && deepIdx < feldLaenge && schlachtfeld[deepIdx].some(e => e.seite !== einheit.seite && e.hp > 0)) {
                                    tiefereFeinde = true; break;
                                }
                            }

                            if (distZurFront < 2 && tiefereFeinde) {
                                willAngreifen = false; 
                            } else {
                                einheit.stealth = false; 
                                zeigeNachricht("Ein Assasine durchbricht die Reihen!", "#aaa", "#8800ff");
                            }
                        }

                        if (willAngreifen) {
                            angriff(einheit, gegnerSlotIndex);
                            einheit.hatAktionGemacht = true; 
                        }
                    } else {
                        let distZurBasis = (einheit.seite === 'gut') ? ((feldLaenge - 1) - i) : (i - 0);
                        if (distZurBasis <= einheit.reichweite) {
                            if (einheit.cooldown <= 0) {
                                if (einheit.seite === 'gut') daten.boese.hp -= einheit.schaden;
                                else daten.gut.hp -= einheit.schaden;
                                einheit.cooldown = einheit.as;
                                einheit.stealth = false; 
                            }
                            einheit.moveTimer = 1;
                            einheit.hatAktionGemacht = true; 
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // PHASE 2: GLOBALES FRONTLINIEN-SCHIEBEN (Formations-Push)
    // ==========================================
    for (let i = 1; i < feldLaenge - 2; i++) {
        let slotLinks = schlachtfeld[i];
        let slotRechts = schlachtfeld[i+1];
        
        let hatGut = slotLinks.some(e => e.seite === 'gut' && e.hp > 0 && !e.stealth);
        let hatBoese = slotRechts.some(e => e.seite === 'boese' && e.hp > 0 && !e.stealth);
        
        if (hatGut && hatBoese) {
            let masseGutGesamt = 0;
            let guteReihen = [ { idx: i, faktor: 1.0 }, { idx: i - 1, faktor: 0.5 }, { idx: i - 2, faktor: 0.25 } ];
            for (let reihe of guteReihen) {
                if (reihe.idx >= 0) masseGutGesamt += schlachtfeld[reihe.idx].filter(e => e.seite === 'gut' && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
            }

            let masseBoeseGesamt = 0;
            let boeseReihen = [ { idx: i + 1, faktor: 1.0 }, { idx: i + 2, faktor: 0.5 }, { idx: i + 3, faktor: 0.25 } ];
            for (let reihe of boeseReihen) {
                if (reihe.idx < feldLaenge) masseBoeseGesamt += schlachtfeld[reihe.idx].filter(e => e.seite === 'boese' && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
            }

            let masseGutBereit = 0;
            for (let reihe of guteReihen) {
                if (reihe.idx >= 0) masseGutBereit += schlachtfeld[reihe.idx].filter(e => e.seite === 'gut' && e.hp > 0 && e.moveTimer <= 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
            }

            let masseBoeseBereit = 0;
            for (let reihe of boeseReihen) {
                if (reihe.idx < feldLaenge) masseBoeseBereit += schlachtfeld[reihe.idx].filter(e => e.seite === 'boese' && e.hp > 0 && e.moveTimer <= 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
            }
            
            if (masseGutBereit >= (masseBoeseGesamt * SCHUB_SCHWELLE)) {
                dominoSchieben(i + 1, 1); 
                let vorrueckendeGute = schlachtfeld[i].filter(e => e.seite === 'gut');
                schlachtfeld[i] = schlachtfeld[i].filter(e => e.seite !== 'gut');
                schlachtfeld[i+1].push(...vorrueckendeGute);
                
                for (let e of vorrueckendeGute) {
                    e.moveTimer = (e.moveWait || 2);
                    e.frischBewegt = true; 
                }
                break; 
            } 
            else if (masseBoeseBereit >= (masseGutGesamt * SCHUB_SCHWELLE)) {
                dominoSchieben(i, -1); 
                let vorrueckendeBoese = schlachtfeld[i+1].filter(e => e.seite === 'boese');
                schlachtfeld[i+1] = schlachtfeld[i+1].filter(e => e.seite !== 'boese');
                schlachtfeld[i].push(...vorrueckendeBoese);
                
                for (let e of vorrueckendeBoese) {
                    e.moveTimer = (e.moveWait || 2);
                    e.frischBewegt = true; 
                }
                break; 
            }
        }
    } // <-- HIER WAREN DIE FEHLENDEN KLAMMERN!

    // ==========================================
    // PHASE 3: NORMALE BEWEGUNG (In leere Slots laufen)
    // ==========================================
    for (let r of richtungen) {
        for (let i = r.start; r.schritt === -1 ? i >= r.ende : i <= r.ende; i += r.schritt) {
            for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
                let einheit = schlachtfeld[i][j];
                if (einheit.seite !== r.seite) continue;
                
                if (einheit.hatAktionGemacht || einheit.moveTimer > 0) continue; 

                let zielIdx = i + r.zielMod;
                if (zielIdx >= 1 && zielIdx <= feldLaenge - 2) {
                    let zielSlot = schlachtfeld[zielIdx];
                    let feindImZiel = zielSlot.some(e => e.seite !== einheit.seite && e.hp > 0);

                    if (feindImZiel && !einheit.stealth) {
                        einheit.moveTimer = 1; 
                    } 
                    else {
                        if (getSlotVolumen(zielSlot) + (einheit.volumen || 1) <= maxSlotVolumen) {
                            schlachtfeld[i].splice(j, 1);
                            zielSlot.push(einheit);
                            einheit.moveTimer = (einheit.moveWait || 2);
                            einheit.frischBewegt = true; 
                        } 
                        else {
                            let sprungIdx = zielIdx + r.zielMod;
                            if (sprungIdx >= 1 && sprungIdx <= feldLaenge - 2) {
                                let sprungSlot = schlachtfeld[sprungIdx];
                                let feindImSprung = sprungSlot.some(e => e.seite !== einheit.seite && e.hp > 0);
                                
                                if ((!feindImSprung || einheit.stealth) && getSlotVolumen(sprungSlot) + (einheit.volumen || 1) <= maxSlotVolumen) {
                                    schlachtfeld[i].splice(j, 1);
                                    sprungSlot.push(einheit);
                                    einheit.moveTimer = (einheit.moveWait || 2) * (einheit.crowdFactor || 2);
                                    einheit.frischBewegt = true; 
                                } else {
                                    einheit.moveTimer = 1; 
                                }
                            } else {
                                einheit.moveTimer = 1; 
                            }
                        }
                    }
                }
            }
        }
    }
}

function heileVerbuedete(heiler, zielSlotIndex) {
    if (heiler.cooldown > 0) return;

    let slot = schlachtfeld[zielSlotIndex];
    let verletzte = slot.filter(e => e.seite === heiler.seite && e.hp > 0 && e.hp < (e.maxHp || 10));

    if (verletzte.length === 0) return;

    verletzte.sort((a, b) => (a.hp / (a.maxHp || 10)) - (b.hp / (b.maxHp || 10)));

    let mom = daten[heiler.seite].momentum;
    let critBonus = mom >= 2 ? (mom - 1) * 0.05 : 0;
    let chance = (heiler.critChance || 0.05) + critBonus; 
    let isCrit = Math.random() < chance;
    
    let healMulti = 1 + (mom * 0.1);
    let basisHeilung = heiler.heilung * healMulti;

    if (isCrit) basisHeilung = Math.floor(basisHeilung * (heiler.critMult || 1.5));
    else basisHeilung = Math.floor(basisHeilung);

    let trefferZaehler = 0;

    for (let i = 0; i < verletzte.length; i++) {
        let ziel = verletzte[i];
        let fehlendeHp = (ziel.maxHp || 10) - ziel.hp;
        let tatsaechlicheHeilung = Math.min(fehlendeHp, basisHeilung);
        
        ziel.hp += tatsaechlicheHeilung;

        let ebene = slot.indexOf(ziel);
        zeigeHeilung(tatsaechlicheHeilung, zielSlotIndex, heiler.seite, ebene, isCrit);

        trefferZaehler++;
        if (trefferZaehler >= (heiler.aoeBreit || 1)) break; 
    }

    if (trefferZaehler > 0) heiler.cooldown = heiler.as;
}

function angriff(angreifer, zielSlotIndex) {
    if (angreifer.cooldown > 0) return;

    // ==========================================
    // SETUP-MECHANIK
    // ==========================================
    if (angreifer.frischBewegt) {
        angreifer.frischBewegt = false; 
        
        if (angreifer.setup > 0) {
            angreifer.cooldown = angreifer.setup; 
            return; 
        }
    }

    let richtung = angreifer.seite === 'gut' ? 1 : -1;
    let angriffErfolgreich = false;

    let mom = daten[angreifer.seite].momentum;
    let dmgMulti = 1 + (mom * 0.1); 

    if (angreifer.typ === 'H') {
        let alleZiele = [];
        
        for (let t = 0; t < angreifer.reichweite; t++) {
            let sIdx = zielSlotIndex + (t * richtung);
            if (sIdx >= 0 && sIdx < feldLaenge) {
                let slot = schlachtfeld[sIdx];
                for (let e = 0; e < slot.length; e++) {
                    if (slot[e].seite !== angreifer.seite && slot[e].hp > 0) {
                        alleZiele.push({ opfer: slot[e], sIdx: sIdx, ebene: e });
                    }
                }
            }
        }
        
        if (alleZiele.length > 0) {
            alleZiele.sort(() => Math.random() - 0.5);
            let trefferZahl = Math.floor(Math.random() * 3) + 3; 
            let ausgewaehlteZiele = alleZiele.slice(0, trefferZahl);
            
            for (let ziel of ausgewaehlteZiele) {
                let critBonus = mom >= 2 ? (mom - 1) * 0.05 : 0;
                let chance = (angreifer.critChance || 0.05) + critBonus; 
                let isCrit = Math.random() < chance;
                
                let finalerSchaden = angreifer.schaden * dmgMulti;
                if (isCrit) finalerSchaden *= (angreifer.critMult || 2.0);
                
                ziel.opfer.hp -= finalerSchaden;
                ziel.opfer.wurdeGetroffen = true; 
                
                zeigeSchaden(finalerSchaden, ziel.sIdx, angreifer.seite, ziel.ebene, isCrit);
                angriffErfolgreich = true;
            }
        }
    } 
    else {
        for (let t = 0; t < angreifer.aoeTief; t++) {
            let aktuellerSlotIndex = zielSlotIndex + (t * richtung);

            if (aktuellerSlotIndex >= 0 && aktuellerSlotIndex < feldLaenge) {
                let slot = schlachtfeld[aktuellerSlotIndex];
                let trefferZaehler = 0;
                
                for (let e = slot.length - 1; e >= 0; e--) {
                    let opfer = slot[e];

                    if (opfer.seite !== angreifer.seite && opfer.hp > 0) {
                        let critBonus = mom >= 2 ? (mom - 1) * 0.05 : 0;
                        let chance = (angreifer.critChance || 0.05) + critBonus; 
                        let isCrit = Math.random() < chance;
                        
                        let finalerSchaden = angreifer.schaden * dmgMulti;
                        
                        if (isCrit) finalerSchaden *= (angreifer.critMult || 2.0);

                        opfer.hp -= finalerSchaden;
                        opfer.wurdeGetroffen = true; 
                        
                        zeigeSchaden(finalerSchaden, aktuellerSlotIndex, angreifer.seite, e, isCrit);
                        trefferZaehler++;
                        angriffErfolgreich = true;

                        if (angreifer.typ === 'W') {
                            let maxHp = angreifer.maxHp || 28; 
                            if (angreifer.hp < maxHp) {
                                angreifer.hp = Math.min(maxHp, angreifer.hp + 1);
                                
                                let wSlot = -1;
                                let wEbene = -1;
                                for(let f = 0; f < feldLaenge; f++) {
                                    let idx = schlachtfeld[f].indexOf(angreifer);
                                    if(idx !== -1) { wSlot = f; wEbene = idx; break; }
                                }
                                if(wSlot !== -1) {
                                    zeigeHeilung(1, wSlot, angreifer.seite, wEbene, false);
                                }
                            }
                        }

                        if (trefferZaehler >= (angreifer.aoeBreit || 1)) break;
                    }
                }
            }
        }
    }

    if (angriffErfolgreich) angreifer.cooldown = angreifer.as;
}


// ==========================================
// 7. HILFSFUNKTIONEN (Engine & Physik)
// ==========================================
function dominoSchieben(idx, richtung) {
    let zielIdx = idx + richtung;
    if (zielIdx < 0 || zielIdx >= feldLaenge) return; 

    let einheiten = schlachtfeld[idx].splice(0);
    if (schlachtfeld[zielIdx].length > 0) dominoSchieben(zielIdx, richtung);
    
    schlachtfeld[zielIdx].push(...einheiten);
    
    einheiten.forEach(e => {
        if (zielIdx === 0 || zielIdx === feldLaenge - 1) e.hp = 0;
    });
}

function getSlotVolumen(slotArray) {
    if (!slotArray) return 0;
    return slotArray.reduce((sum, e) => sum + (e.volumen || 1), 0);
}

function entferneToteEinheiten() {
    // HIER NUTZEN WIR JETZT DIE BERECHNETEN BUFFS AUS DEM SHOP!
    let multiHoffnung = metaBuffs.hoffnungMulti || 1.0;
    let multiBlut = metaBuffs.blutMulti || 1.0;

    for (let i = 0; i < feldLaenge; i++) {
        for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
            let opfer = schlachtfeld[i][j];
            if (opfer.hp <= 0) {
                let wertung = opfer.metaWert || 1;
                
                // Wir multiplizieren den Drop direkt beim Tod der Einheit!
                if (opfer.seite === 'boese') {
                    rundeErtrag.hoffnung += (wertung * multiHoffnung);
                } else {
                    rundeErtrag.blut += (wertung * multiBlut);
                }
                
                schlachtfeld[i].splice(j, 1);
            }
        }
    }
}

function generiereEinkommen() {
    let einkommenGut = 1; // Basis-Einkommen
    let einkommenBoese = 1; // Basis-Einkommen

    for (let i = 0; i < feldLaenge; i++) {
        for (let j = 0; j < schlachtfeld[i].length; j++) {
            let e = schlachtfeld[i][j];
            if (e.seite === 'gut') einkommenGut += (e.einkommen || 1); 
            else einkommenBoese += (e.einkommen || 1);
        }
    }

    daten.gut.res += einkommenGut;
    daten.boese.res += einkommenBoese;
    
    // NEU: Wir speichern die exakte Rate für das UI ab
    daten.gut.aktuelleRate = einkommenGut;
    daten.boese.aktuelleRate = einkommenBoese;
}

function verarbeiteBelagerungsSchaden() {
    let rechtesTorIdx = feldLaenge - 2;
    for (let einheit of schlachtfeld[rechtesTorIdx]) {
        if (einheit.seite === 'gut' && einheit.hp > 0) daten.boese.hp -= (einheit.belagerung || 1);
    }
    let linkesTorIdx = 1;
    for (let einheit of schlachtfeld[linkesTorIdx]) {
        if (einheit.seite === 'boese' && einheit.hp > 0) daten.gut.hp -= (einheit.belagerung || 1);
    }
}

function berechneFrontlinie() {
    let maxGut = 0; 
    let minBoese = feldLaenge - 1; 
    let auraDruckGut = 0;
    let auraDruckBoese = 0;

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

    let frontMasseGut = 0;
    let frontMasseBoese = 0;

    let reihenGut = [ { idx: maxGut, faktor: 1.0 }, { idx: maxGut - 1, faktor: 0.5 }, { idx: maxGut - 2, faktor: 0.25 } ];
    for (let r of reihenGut) {
        if (r.idx >= 0 && r.idx < feldLaenge) {
            frontMasseGut += schlachtfeld[r.idx].filter(e => e.seite === 'gut' && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * r.faktor;
        }
    }

    let reihenBoese = [ { idx: minBoese, faktor: 1.0 }, { idx: minBoese + 1, faktor: 0.5 }, { idx: minBoese + 2, faktor: 0.25 } ];
    for (let r of reihenBoese) {
        if (r.idx >= 0 && r.idx < feldLaenge) {
            frontMasseBoese += schlachtfeld[r.idx].filter(e => e.seite === 'boese' && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * r.faktor;
        }
    }

    daten.gut.aktuelleMasse = frontMasseGut;
    daten.boese.aktuelleMasse = frontMasseBoese;

    let frontMitte = (maxGut + minBoese) / 2;
    frontMitte += (auraDruckGut - auraDruckBoese);

    daten.balance = Math.max(0, Math.min(100, (frontMitte / (feldLaenge - 1)) * 100)); 
    
    // NEU: Wir merken uns die Front für die Stealth-Mechanik
    daten.frontGut = maxGut;
    daten.frontBoese = minBoese;
}


// --- NEU: EVENT NACHRICHTEN SENDEN ---
function zeigeNachricht(text, farbe = "#ddd", rahmenFarbe = "#55aaff") {
    const eventBox = document.getElementById('event-box');
    const eventText = document.getElementById('event-text');
    
    if (eventBox && eventText) {
        eventText.innerText = text;
        eventText.style.color = farbe;
        eventBox.style.borderLeftColor = rahmenFarbe;
    }
}

// Test-Aufruf: Du kannst diese Funktion später überall im Code aufrufen!
// Beispiel: zeigeNachricht("Ein Oger hat das Schlachtfeld betreten!", "#ff4444", "#ff0000");

// ==========================================
// 8. UI & VISUAL EFFECTS
// ==========================================
function updateUI() {
    document.getElementById('res-gut').innerText = "Glaube: " + Math.floor(daten.gut.res) + " ✝️";
    document.getElementById('res-boese').innerText = "Furcht: " + Math.floor(daten.boese.res) + " 💀";

    // --- MOMENTUM BERECHNUNG & ANZEIGE ---
    const fillGut = document.getElementById('balance-fill-gut');
    const fillBoese = document.getElementById('balance-fill-boese');

    if (fillGut && fillBoese) {
        fillGut.style.width = daten.balance + "%";
        fillBoese.style.width = (100 - daten.balance) + "%";

        let momGut = 0;
        if (daten.balance >= 90) momGut = 4;
        else if (daten.balance >= 80) momGut = 3;
        else if (daten.balance >= 70) momGut = 2;
        else if (daten.balance >= 60) momGut = 1;

        let momBoese = 0;
        if (daten.balance <= 10) momBoese = 4;
        else if (daten.balance <= 20) momBoese = 3;
        else if (daten.balance <= 30) momBoese = 2;
        else if (daten.balance <= 40) momBoese = 1;

        daten.gut.momentum = momGut;
        daten.boese.momentum = momBoese;
        daten.gut.metaBuff = momBoese; 
        daten.boese.metaBuff = momGut;

        let buffsGut = [];
        let buffsBoese = [];

        if (momGut >= 1) buffsGut.push(`🔥 +${momGut * 10}% Schaden`);
        if (momGut >= 2) buffsGut.push(`⚔️ +${(momGut - 1) * 5}% Krit`);
        if (momGut >= 3) buffsGut.push(`💨 +${(momGut - 2) * 10}% Tempo`);
        if (momGut >= 4) buffsGut.push(`🏗️ +10% Spawn-Rate`);
        if (daten.gut.metaBuff > 0) buffsGut.push(`✨ +${daten.gut.metaBuff * 100}% Hoffnung`);

        if (momBoese >= 1) buffsBoese.push(`🔥 +${momBoese * 10}% Schaden`);
        if (momBoese >= 2) buffsBoese.push(`⚔️ +${(momBoese - 1) * 5}% Krit`);
        if (momBoese >= 3) buffsBoese.push(`💨 +${(momBoese - 2) * 10}% Tempo`);
        if (momBoese >= 4) buffsBoese.push(`🏗️ +10% Spawn-Rate`);
        if (daten.boese.metaBuff > 0) buffsBoese.push(`🩸 +${daten.boese.metaBuff * 100}% Blut`);

        const boxGut = document.getElementById('buffs-gut');
        const boxBoese = document.getElementById('buffs-boese');
        if (boxGut && boxBoese) {
            boxGut.innerHTML = buffsGut.length > 0 ? buffsGut.join('<br>') : "";
            boxBoese.innerHTML = buffsBoese.length > 0 ? buffsBoese.join('<br>') : "";
        }

        const pointer = document.getElementById('balance-pointer');
        if (pointer) {
            pointer.style.left = daten.balance + "%";
            if (Math.abs(daten.lastBalance - daten.balance) > 0.5) {
                pointer.classList.add('pointer-pulse');
                setTimeout(() => pointer.classList.remove('pointer-pulse'), 400); 
                daten.lastBalance = daten.balance;
            }
        }
    }

    document.getElementById('run-hoffnung').innerText = Math.floor(rundeErtrag.hoffnung);
    document.getElementById('run-blut').innerText = Math.floor(rundeErtrag.blut);
    document.getElementById('meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
    document.getElementById('meta-blut').innerText = metaProgress.blutGesamt;
    if(document.getElementById('masse-gut')) document.getElementById('masse-gut').innerText = Number(daten.gut.aktuelleMasse).toFixed(1);
    if(document.getElementById('masse-boese')) document.getElementById('masse-boese').innerText = Number(daten.boese.aktuelleMasse).toFixed(1);

    const genGutAnzeige = document.getElementById('gen-gut');
    const genBoeseAnzeige = document.getElementById('gen-boese');
    
    // Zieht sich die frischen Raten und rundet sie zwingend auf 1 Nachkommastelle
    if (genGutAnzeige) genGutAnzeige.innerText = Number(daten.gut.aktuelleRate || 2).toFixed(1); 
    if (genBoeseAnzeige) genBoeseAnzeige.innerText = Number(daten.boese.aktuelleRate || 2).toFixed(1); 

// SCHLACHTFELD RENDER
    const display = document.getElementById('battle-display');
    display.innerHTML = ""; 

    for (let i = 0; i < feldLaenge; i++) {
        let slotDiv = document.createElement('div');
        slotDiv.className = 'slot';

        let freiesVolumen = Math.max(0, maxSlotVolumen - getSlotVolumen(schlachtfeld[i])); 
        for (let v = 0; v < freiesVolumen; v++) {
            let punkt = document.createElement('div');
            punkt.className = 'einheit-punkt';
            if (i === 0) { punkt.innerText = "•"; punkt.style.color = "rgba(0, 116, 217, 0.7)"; } 
            else if (i === feldLaenge - 1) { punkt.innerText = "•"; punkt.style.color = "rgba(255, 65, 54, 0.7)"; } 
            else { punkt.innerText = "."; punkt.style.color = "#444"; }
            slotDiv.appendChild(punkt);
        }

        for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
            let e = schlachtfeld[i][j];
            let punkt = document.createElement('div');
            punkt.className = 'einheit-punkt';

            if (e.wurdeGetroffen) { punkt.classList.add('hit-flash'); e.wurdeGetroffen = false; }
            punkt.style.opacity = Math.max(0.25, (e.hp || 10) / (e.maxHp || 10));
            punkt.innerText = e.typ ? e.typ.substring(0, 2).toUpperCase() : "?";
            punkt.style.color = (e.seite === 'gut') ? '#55aaff' : '#ff5555';
            punkt.style.fontWeight = "bold";

            if ((e.volumen || 1) > 1) {
                punkt.style.display = "flex";
                punkt.style.alignItems = "center";      
                punkt.style.justifyContent = "center";  
                punkt.style.height = `calc(${e.volumen} * 1.2em)`; 
                punkt.style.width = "100%"; 
                punkt.style.backgroundColor = (e.seite === 'gut') ? "rgba(20, 100, 180, 0.4)" : "rgba(180, 20, 20, 0.4)"; 
                punkt.style.borderRadius = "3px";
                punkt.style.margin = "1px 0"; 
                punkt.style.boxShadow = (e.seite === 'gut') ? "0 0 8px rgba(85, 170, 255, 0.5)" : "0 0 8px rgba(255, 85, 85, 0.5)";
            }
            slotDiv.appendChild(punkt);
        }
        display.appendChild(slotDiv);
    }

    const visualBaseGut = document.querySelector('.base-gut');
    const visualBaseBoese = document.querySelector('.base-boese');
    if (visualBaseGut) visualBaseGut.innerText = daten.gut.hp + " / " + daten.gut.maxHp;
    if (visualBaseBoese) visualBaseBoese.innerText = daten.boese.hp + " / " + daten.boese.maxHp;

// BUTTONS & TOOLTIPS
    function generiereTooltip(stats) {
        let prozentRate = Math.round((stats.spawnRate || 0.1) * 100);
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

    ['ritter', 'bogenschuetze', 'priester', 'kavallerie', 'lanzentraeger', 'artillerie'].forEach(u => {
        let btn = document.getElementById('btn-' + u);
        if (btn) btn.disabled = (daten.gut.res < getKosten(u));
        
        let txt = document.getElementById('txt-' + u);
        // HIER NEU: Er zieht sich den exakten Gebäudenamen aus dem Katalog!
        let gebaeude = einheitenStats[u].gebaeudeName;
        if (txt) txt.innerText = `${gebaeude} (${getKosten(u)}) | Gebaut: ${daten.gut.kasernen[u]} [${Math.floor(produktionProgress[u] * 100)}%]`;
        
        let tt = document.getElementById('tt-' + u);
        if (tt) tt.innerHTML = generiereTooltip(einheitenStats[u]);
    });

    ['skelett', 'oger', 'hexer', 'daemon', 'assasine', 'werwolf'].forEach(u => {
        let btn = document.getElementById('btn-' + u);
        if (btn) btn.disabled = (daten.boese.res < getKosten(u));
        
        let txt = document.getElementById('txt-' + u);
        // HIER NEU: Das gleiche für die Bösen!
        let gebaeude = einheitenStats[u].gebaeudeName;
        if (txt) txt.innerText = `${gebaeude} (${getKosten(u)}) | Gebaut: ${daten.boese.kasernen[u]} [${Math.floor(produktionProgress[u] * 100)}%]`;
        
        let tt = document.getElementById('tt-' + u);
        if (tt) tt.innerHTML = generiereTooltip(einheitenStats[u]);
    });


} // <-- Hier endet updateUI() Funktion

function zeigeSchaden(schaden, slotIndex, angreiferSeite, ebene, isCrit = false) {
    const display = document.getElementById('battle-display');
    const wrapper = document.querySelector('.battle-wrapper');
    if (!display || !wrapper) return;
    const zielSlot = display.getElementsByClassName('slot')[slotIndex];
    if (!zielSlot) return; 

    const flText = document.createElement('div');
    flText.className = 'schaden-text';
    
    if (isCrit) {
        flText.innerText = "-" + Math.floor(schaden) + "!"; 
        flText.style.color = "#FFD700"; 
        flText.style.fontWeight = "900";
        flText.style.fontSize = "1.5em"; 
        flText.style.textShadow = "0px 0px 10px #ffaa00, 2px 2px 0px black";
        flText.style.zIndex = "10"; 
    } else {
        flText.innerText = "-" + Math.floor(schaden);
        flText.style.color = "#ffffff";
        flText.style.textShadow = (angreiferSeite === 'gut') ? "0px 0px 8px #55aaff, 2px 2px 0px black" : "0px 0px 8px #ff5555, 2px 2px 0px black";
    }

    flText.style.position = 'absolute';
    let randomX = Math.floor(Math.random() * 30) - 15; 
    let randomY = Math.floor(Math.random() * 30) - 15;
    let ebenenOffset = (ebene !== undefined) ? (ebene * 24) : 48; 

    flText.style.left = (zielSlot.getBoundingClientRect().left - wrapper.getBoundingClientRect().left + (zielSlot.getBoundingClientRect().width / 2) - 10 + randomX) + 'px'; 
    flText.style.top = (zielSlot.getBoundingClientRect().bottom - wrapper.getBoundingClientRect().top - ebenenOffset - 35 + randomY) + 'px'; 

    wrapper.appendChild(flText);
    setTimeout(() => { if(flText.parentNode) flText.parentNode.removeChild(flText); }, isCrit ? 2500 : 1000); 
}

function zeigeHeilung(wert, slotIndex, heilerSeite, ebene, isCrit) {
    const display = document.getElementById('battle-display');
    const wrapper = document.querySelector('.battle-wrapper');
    if (!display || !wrapper) return;
    const zielSlot = display.getElementsByClassName('slot')[slotIndex];
    if (!zielSlot) return;
    
    const text = document.createElement('div');
    text.className = 'schaden-text';
    text.innerText = "+" + Math.floor(wert);
    text.style.color = "#2ecc71"; 
    text.style.textShadow = "0px 0px 5px #000";
    
    if (isCrit) {
        text.style.color = "#00ff88"; 
        text.style.fontSize = "1.5rem";
        text.style.fontWeight = "bold";
        text.style.textShadow = "0px 0px 10px #00ff88, 2px 2px 0px black";
        text.style.zIndex = "10";
    }
    
    text.style.position = 'absolute';
    let randomX = Math.floor(Math.random() * 20) - 10; 
    let randomY = Math.floor(Math.random() * 20) - 10;
    let ebenenOffset = (ebene !== undefined) ? (ebene * 24) : 48; 

    text.style.left = (zielSlot.getBoundingClientRect().left - wrapper.getBoundingClientRect().left + (zielSlot.getBoundingClientRect().width / 2) - 10 + randomX) + 'px'; 
    text.style.top = (zielSlot.getBoundingClientRect().bottom - wrapper.getBoundingClientRect().top - ebenenOffset - 45 + randomY) + 'px'; 
    
    wrapper.appendChild(text);
    setTimeout(() => { if(text.parentNode) text.parentNode.removeChild(text); }, isCrit ? 2000 : 1000);
}

// ==========================================
// 9. GAME OVER & ENGINE LOOP
// ==========================================
function checkGameOver() {
    if (daten.gut.hp <= 0 || daten.boese.hp <= 0) {
        let gewonneneHoffnung = Math.floor(rundeErtrag.hoffnung || 0);
        let gewonnenesBlut = Math.floor(rundeErtrag.blut || 0);

        metaProgress.hoffnungGesamt += gewonneneHoffnung;
        metaProgress.blutGesamt += gewonnenesBlut;

        try {
            localStorage.setItem('hoffnungGesamt', metaProgress.hoffnungGesamt);
            localStorage.setItem('blutGesamt', metaProgress.blutGesamt);
        } catch (e) {
            console.warn("Speichern im LocalStorage fehlgeschlagen.", e);
        }

        let sieger = daten.boese.hp <= 0 ? "DAS LICHT" : "DIE FINSTERNIS";
        alert("Run beendet! " + sieger + " hat die gegnerische Basis zerstört.\nErhaltene Hoffnung: " + gewonneneHoffnung + "\nErhaltenes Blut: " + gewonnenesBlut);
        location.reload();
    }
}

// DIE ENGINE
setInterval(() => {
    if (!spielPausiert) {
        bewegeEinheiten();               
        verarbeiteKasernenProduktion();
        entferneToteEinheiten();         
        generiereEinkommen();
        verarbeiteBelagerungsSchaden();
        berechneFrontlinie(); 
        updateUI();                      
        checkGameOver();
    }
}, 1000);


// ==========================================
// 10. STEUERUNG (HOTKEYS)
// ==========================================
window.addEventListener('keydown', function(event) {
    switch(event.key.toUpperCase()) {
        // Gut
        case 'Q': kaufeKaserne('ritter'); break;
        case 'W': kaufeKaserne('bogenschuetze'); break;
        case 'E': kaufeKaserne('priester'); break; 
        case 'R': kaufeKaserne('kavallerie'); break; 
        case 'T': kaufeKaserne('lanzentraeger'); break; 
        case 'Z': kaufeKaserne('artillerie'); break; // Nutze 'Y' falls du ein englisches Layout bevorzugst

        // Böse
        case 'I': kaufeKaserne('skelett'); break;
        case 'O': kaufeKaserne('oger'); break;
        case 'P': kaufeKaserne('hexer'); break;
        case 'K': kaufeKaserne('daemon'); break;
        case 'L': kaufeKaserne('assasine'); break;
	case 'J': kaufeKaserne('werwolf'); break;
    }
});



// =====================================================================
// =====================================================================
//                       11. META SHOP (PHASE 6)
// =====================================================================
// =====================================================================

function oeffneShop() {
    spielPausiert = true; // Spiel friert ein!
    
    // NEU: Wir befüllen die Anzeige mit deinen echten Meta-Währungen
    document.getElementById('shop-meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
    document.getElementById('shop-meta-blut').innerText = metaProgress.blutGesamt;
    
    document.getElementById('shop-modal').classList.remove('shop-hidden');
    document.body.classList.add('modal-open');
    aktualisiereShopUI();
}

function schließeShop() {
    document.getElementById('shop-modal').classList.add('shop-hidden');
    spielPausiert = false; // Spiel läuft weiter!
    
    // NEU: Gibt das Scrollen auf der Hauptseite wieder frei!
    document.body.classList.remove('modal-open');
}

// --- SHOP INFO-TAFEL STEUERUNG ---
function zeigeShopInfo(id, titel, beschreibung, kostenHoffnung = 0, kostenBlut = 0) {
    let anzeigeTitel = titel;
    
    // 1. Text anpassen, wenn gekauft
    if (gekaufteKnoten[id] === true) {
        anzeigeTitel += " (bereits gekauft)";
        document.getElementById('shop-info-title').style.color = "#FFD700"; // Optional: Titel golden machen
    } else {
        document.getElementById('shop-info-title').style.color = "white";
    }

    document.getElementById('shop-info-title').innerText = anzeigeTitel;
    document.getElementById('shop-info-desc').innerText = beschreibung;
    
    let costsDiv = document.getElementById('shop-info-costs');
    if (costsDiv) {
        // 2. Kosten verstecken, wenn der Knoten schon gekauft ist
        if (gekaufteKnoten[id] === true) {
            costsDiv.style.display = "none";
        } 
        // 3. Kosten anzeigen, falls nicht gekauft
        else if (kostenHoffnung > 0 || kostenBlut > 0) {
            let costText = "Kosten: ";
            
            if (kostenHoffnung > 0) {
                costText += `<span style="color: #55aaff; text-shadow: 0 0 8px rgba(0, 116, 217, 0.8);">✨ ${kostenHoffnung} Hoffnung</span> `;
            }
            if (kostenHoffnung > 0 && kostenBlut > 0) {
                costText += ' &nbsp;|&nbsp; ';
            }
            if (kostenBlut > 0) {
                costText += `<span style="color: #ff5555; text-shadow: 0 0 8px rgba(255, 65, 54, 0.8);">🩸 ${kostenBlut} Blut</span>`;
            }
            
            costsDiv.innerHTML = costText;
            costsDiv.style.display = "block";
        } else {
            costsDiv.style.display = "none";
        }
    }
}

function versteckeShopInfo() {
    document.getElementById('shop-info-title').innerText = "Schicksalsknoten";
    document.getElementById('shop-info-desc').innerText = "Bewege die Maus über ein Symbol, um seine Macht zu offenbaren.";
    
    let costsDiv = document.getElementById('shop-info-costs');
    if (costsDiv) costsDiv.style.display = "none"; // Beim Wegziehen der Maus wieder verstecken
}

// ==========================================
// SHOP & SKILLTREE LOGIK
// ==========================================

// Wird aufgerufen, wenn der Shop geöffnet wird oder das Spiel lädt
function aktualisiereShopUI() {
    for (let id in gekaufteKnoten) {
        let btn = document.getElementById(id);
        if (!btn) continue; // Falls der Button im HTML noch nicht existiert

        if (gekaufteKnoten[id] === true) {
            btn.classList.add('gekauft');
            
            // Falls es eine Linie zu diesem Punkt gibt, diese auch leuchten lassen
            // (z.B. "line-mitte-1-zu-2" - du musst im HTML nur die ID der Linie passend benennen!)
            let linieId = "line-" + id.replace('node-', ''); 
            let linie = document.getElementById(linieId);
            if (linie) linie.classList.add('gekauft');
        }
    }
    
    // Die Anzeige für Blut und Hoffnung im Shop-Header aktualisieren
    if (document.getElementById('shop-meta-hoffnung')) {
        document.getElementById('shop-meta-hoffnung').innerText = metaProgress.hoffnungGesamt;
        document.getElementById('shop-meta-blut').innerText = metaProgress.blutGesamt;
    }
}

function kaufeKnoten(id, kostenH, kostenB, voraussetzungen) {
    // 1. Ist es schon gekauft?
    if (gekaufteKnoten[id]) return;

    // 2. Prüfung der Voraussetzungen
    for (let vor of voraussetzungen) {
        if (!gekaufteKnoten[vor]) {
            alert("Du musst zuerst den vorherigen Skill freischalten!");
            return;
        }
    }

    // 3. Prüfung der Ressourcen (aus metaProgress)
    if (metaProgress.hoffnungGesamt >= kostenH && metaProgress.blutGesamt >= kostenB) {
        // Ressourcen abziehen
        metaProgress.hoffnungGesamt -= kostenH;
        metaProgress.blutGesamt -= kostenB;
        
        // Status setzen
        gekaufteKnoten[id] = true;
        
        // --- DIE WICHTIGEN 3 SCHRITTE ---
        speichereMeta();       // Sichert das Geld und den Knoten im Browser
        berechneMetaBuffs();   // Liest den Baum neu aus und aktiviert den 50% Buff!
        aktualisiereShopUI();  // Lässt den Button & Linie aufleuchten und updatet die Geldanzeige
        
        console.log(id + " erfolgreich gekauft!");
    } else {
        alert("Nicht genug Ressourcen!");
    }
}

// ==========================================
// 12. ENTWICKLER-TOOLS (Hard Reset)
// ==========================================
function resetSpeicher() {
    if (confirm("Willst du wirklich deinen kompletten Fortschritt (Geld & Skills) löschen? Dies kann nicht rückgängig gemacht werden!")) {
        localStorage.clear(); // Löscht den kompletten Speicher
        location.reload();    // Lädt die Seite sofort neu
    }
}