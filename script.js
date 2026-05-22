// ==========================================
// 1. PERMANENTER SPEICHER (Meta-Fortschritt)
// ==========================================
let metaProgress = {
    hoffnungGesamt: 0,
    blutGesamt: 0
};
let spielPausiert = false;

try {
    let h = localStorage.getItem('hoffnungGesamt');
    let b = localStorage.getItem('blutGesamt');
    
    if (h) metaProgress.hoffnungGesamt = parseInt(h) || 0;
    if (b) metaProgress.blutGesamt = parseInt(b) || 0;
} catch (e) {
    console.error("Speicher-Fehler ignoriert: Browser-Datenbank ist korrupt.");
}

// ==========================================
// 2. SPIELDATEN & WIRTSCHAFT
// ==========================================
let rundeErtrag = {
    hoffnung: 0,
    blut: 0
};

let produktionProgress = {
    ritter: 0,
    bogenschuetze: 0,
    priester: 0,
    skelett: 0,
    oger: 0 
};

let daten = {
    gut: { 
        res: 100, 
        hp: 100,      
        maxHp: 100,
        kasernen: { ritter: 0, bogenschuetze: 0, priester: 0 },
        aktuelleMasse: 0,
        momentum: 0,
        metaBuff: 0
    },
    boese: { 
        res: 100, 
        hp: 100,      
        maxHp: 100,
        kasernen: { skelett: 0, oger: 0 },
        aktuelleMasse: 0,
        momentum: 0,
        metaBuff: 0
    },
    balance: 50,
    lastBalance: 50
};

// ==========================================
// 3. SCHLACHTFELD-STRUKTUR
// ==========================================
let feldLaenge = 22;
let maxBreite = 1; 
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
        spawnRate: 0.04, belagerung: 2,
        beschreibung: "Baut eine Kaserne, die stetig schwere Nahkämpfer produziert."
    },
    bogenschuetze: {
        typ: 'B', seite: 'gut', kosten: 50, hp: 6, masse: 1, volumen: 1, 
        schaden: 3, reichweite: 4, as: 1, critChance: 0.2, critMult: 1.5,
        cooldown: 0, setup: 2, aoeBreit: 1, aoeTief: 1, moveWait: 5, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: 0, einkommen: 0.5, metaWert: 2,
        spawnRate: 0.03, belagerung: 1,
        beschreibung: "Errichtet einen Schießstand für Fernkämpfer."
    },
    priester: {
        typ: 'P', seite: 'gut', kosten: 80, hp: 10, masse: 1, volumen: 1,          
        schaden: 0, heilung: 3, reichweite: 3, as: 3, critChance: 0.10, critMult: 1.5,           
        cooldown: 0, setup: 1, aoeBreit: 5, aoeTief: 1, moveWait: 3, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: 0, einkommen: 0.3, metaWert: 3, 
        spawnRate: 0.015, belagerung: 0,    
        beschreibung: "Nutzt göttliche Magie, um Verbündete an der Front zu heilen."
    },
    skelett: {
        typ: 'S', seite: 'boese', kosten: 40, hp: 13, masse: 1, volumen: 1, 
        schaden: 5, reichweite: 1, as: 2, critChance: 0.05, critMult: 2.0,        
        cooldown: 0, setup: 0, aoeBreit: 1, aoeTief: 1, moveWait: 2, moveTimer: 0,
        crowdFactor: 1, auraDruck: 0, position: feldLaenge - 1, einkommen: 0.5,
        metaWert: 2, spawnRate: 0.04, belagerung: 2,
        beschreibung: "Erweckt stetig billige Krieger aus dem verseuchten Boden."
    },
    oger: {
        typ: 'O', seite: 'boese', kosten: 100, hp: 100, masse: 8, volumen: 2,          
        schaden: 13, reichweite: 1, as: 4, critChance: 0.05, critMult: 3.0,           
        cooldown: 0, setup: 1, aoeBreit: 3, aoeTief: 1, moveWait: 5, moveTimer: 0,
        crowdFactor: 2, auraDruck: 0, position: feldLaenge - 1, einkommen: 1.5,
        metaWert: 5, spawnRate: 0.01, belagerung: 7,    
        beschreibung: "Beschwört einen gigantischen Titanen, der enorm viel Masse und Platz beansprucht."
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
    if (getSlotVolumen(schlachtfeld[slotIdx]) + benoetigtesVolumen > 5) {
        return false; 
    }

    let neueEinheit = erstelleEinheit(name);
    schlachtfeld[slotIdx].push(neueEinheit);
    return true; 
}

function verarbeiteKasernenProduktion() {
    let units = ['ritter', 'bogenschuetze', 'priester', 'skelett', 'oger'];
    
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

// START-ARMEE 
for (let i = 0; i < 5; i++) {
    schlachtfeld[0].push(erstelleEinheit('ritter'));
    schlachtfeld[feldLaenge - 1].push(erstelleEinheit('skelett'));
}

// ==========================================
// 6. KAMPF, BEWEGUNG & HEILUNG
// ==========================================
function bewegeEinheiten() {
    for (let i = 0; i < feldLaenge; i++) {
        for (let einheit of schlachtfeld[i]) {
            let mom = daten[einheit.seite].momentum;
            let tempoBonus = mom >= 3 ? (mom - 2) * 0.1 : 0; 
            
            if (einheit.moveTimer > 0) einheit.moveTimer -= (1 + tempoBonus);
            if (einheit.cooldown > 0) einheit.cooldown -= (1 + tempoBonus);
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

                // NEU HINZUGEFÜGT: Stellt sicher, dass Kämpfer/Heiler nicht laufen
                let aktionAusgefuehrt = false;

                // --- HEILEN ODER ANGREIFEN ---
                if (einheit.heilung && einheit.heilung > 0) {
                    let heilSlotIndex = -1;
                    for (let dist = 0; dist <= einheit.reichweite; dist++) {
                        let checkIdx = i + (dist * r.zielMod);
                        if (checkIdx >= 0 && checkIdx < feldLaenge) {
                            let brauchtHeilung = schlachtfeld[checkIdx].some(e => {
                                if (e.seite !== einheit.seite || e.hp <= 0) return false;
                                return e.hp < (e.maxHp || 10);
                            });

                            if (brauchtHeilung) {
                                heilSlotIndex = checkIdx;
                                break;
                            }
                        }
                    }

                    if (heilSlotIndex !== -1) {
                        heileVerbuedete(einheit, heilSlotIndex);
                        aktionAusgefuehrt = true; // Heiler heilt -> läuft nicht
                    } else {
                        // Der Heiler schaut, ob vor ihm Feinde sind.
                        let feindInSicht = false;
                        for (let dist = 1; dist <= einheit.reichweite; dist++) {
                            let checkIdx = i + (dist * r.zielMod);
                            if (checkIdx >= 0 && checkIdx < feldLaenge) {
                                if (schlachtfeld[checkIdx].some(e => e.seite !== einheit.seite && e.hp > 0)) {
                                    feindInSicht = true;
                                    break;
                                }
                            }
                        }
                        if (feindInSicht) {
                            // HIER DER FIX: Sag der Engine, dass der Heiler "beschäftigt" ist!
                            einheit.moveTimer = 1; 
                            aktionAusgefuehrt = true; 
                        }
                    }
                } else {
                    // Angreifer Scan
                    let gegnerSlotIndex = -1;
                    for (let dist = 0; dist <= einheit.reichweite; dist++) {
                        let checkIdx = i + (dist * r.zielMod);
                        if (checkIdx >= 0 && checkIdx < feldLaenge && 
                            schlachtfeld[checkIdx].some(e => e.seite !== einheit.seite && e.hp > 0)) {
                            gegnerSlotIndex = checkIdx;
                            break;
                        }
                    }

                    if (gegnerSlotIndex !== -1) {
                        angriff(einheit, gegnerSlotIndex);
                        // HIER VERBESSERT: Wer angreifen WILL, bleibt stehen, auch wenn Cooldown!
                        aktionAusgefuehrt = true; 
                    } else {
                        let distZurBasis = (einheit.seite === 'gut') ? ((feldLaenge - 1) - i) : (i - 0);
                        if (distZurBasis <= einheit.reichweite) {
                            if (einheit.cooldown <= 0) {
                                if (einheit.seite === 'gut') daten.boese.hp -= einheit.schaden;
                                else daten.gut.hp -= einheit.schaden;
                                einheit.cooldown = einheit.as;
                            }
                            einheit.moveTimer = 1;
                            aktionAusgefuehrt = true; // Basis-Angreifer laufen nicht weiter
                        }
                    }
                }

                // --- BEWEGUNG & PHYSIK ---
                // HIER DER ZWEITE TEIL DES FIXES: Wer was tut, überspringt die Bewegung sofort.
                if (aktionAusgefuehrt || einheit.moveTimer > 0) continue; 

                let zielIdx = i + r.zielMod;
                if (zielIdx >= 1 && zielIdx <= feldLaenge - 2) {
                    let zielSlot = schlachtfeld[zielIdx];
                    let feindImZiel = zielSlot.some(e => e.seite !== einheit.seite && e.hp > 0);

                    if (feindImZiel) {
                        let masseEigene = 0;
                        let eigeneReihen = [ { idx: i, faktor: 1.0 }, { idx: i - r.zielMod, faktor: 0.5 }, { idx: i - (r.zielMod * 2), faktor: 0.25 } ];
                        for (let reihe of eigeneReihen) {
                            if (reihe.idx >= 0 && reihe.idx < feldLaenge) {
                                masseEigene += schlachtfeld[reihe.idx].filter(e => e.seite === einheit.seite && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
                            }
                        }

                        let masseFeind = 0;
                        let feindReihen = [ { idx: zielIdx, faktor: 1.0 }, { idx: zielIdx + r.zielMod, faktor: 0.5 }, { idx: zielIdx + (r.zielMod * 2), faktor: 0.25 } ];
                        for (let reihe of feindReihen) {
                            if (reihe.idx >= 0 && reihe.idx < feldLaenge) {
                                masseFeind += schlachtfeld[reihe.idx].filter(e => e.seite !== einheit.seite && e.hp > 0).reduce((sum, e) => sum + (e.masse || 1), 0) * reihe.faktor;
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
                    } else if (getSlotVolumen(zielSlot) + (einheit.volumen || 1) <= 5) {
                        schlachtfeld[i].splice(j, 1);
                        zielSlot.push(einheit);
                        einheit.moveTimer = (einheit.moveWait || 2);
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

    let richtung = angreifer.seite === 'gut' ? 1 : -1;
    let angriffErfolgreich = false;

    // --- MOMENTUM BERECHNUNG ---
    let mom = daten[angreifer.seite].momentum;
    let dmgMulti = 1 + (mom * 0.1); // 10% pro Stufe

    for (let t = 0; t < angreifer.aoeTief; t++) {
        let aktuellerSlotIndex = zielSlotIndex + (t * richtung);

        if (aktuellerSlotIndex >= 0 && aktuellerSlotIndex < feldLaenge) {
            let slot = schlachtfeld[aktuellerSlotIndex];
            let trefferZaehler = 0;
            
            for (let e = slot.length - 1; e >= 0; e--) {
                let opfer = slot[e];

                if (opfer.seite !== angreifer.seite && opfer.hp > 0) {
                    // --- CRIT BERECHNUNG ---
                    let critBonus = mom >= 2 ? (mom - 1) * 0.05 : 0;
                    let chance = (angreifer.critChance || 0.05) + critBonus; 
                    let isCrit = Math.random() < chance;
                    
                    // Hier berechnen wir den Schaden WIRKLICH
                    let finalerSchaden = angreifer.schaden * dmgMulti;
                    
                    if (isCrit) {
                        finalerSchaden *= (angreifer.critMult || 2.0);
                    }

                    // Schadens-Anwendung
                    opfer.hp -= finalerSchaden;
                    opfer.wurdeGetroffen = true; 
                    
                    zeigeSchaden(finalerSchaden, aktuellerSlotIndex, angreifer.seite, e, isCrit);
                    trefferZaehler++;
                    angriffErfolgreich = true;

                    if (trefferZaehler >= angreifer.aoeBreit) break;
                }
            }
        }
    }
    // Setze Cooldown nur, wenn wirklich ein Angriff stattfand
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
    let metaMultiGut = 1 + (daten.gut.metaBuff || 0);
    let metaMultiBoese = 1 + (daten.boese.metaBuff || 0);

    for (let i = 0; i < feldLaenge; i++) {
        for (let j = schlachtfeld[i].length - 1; j >= 0; j--) {
            let opfer = schlachtfeld[i][j];
            if (opfer.hp <= 0) {
                let wertung = opfer.metaWert || 1; 
                if (opfer.seite === 'boese') rundeErtrag.hoffnung += (wertung * metaMultiGut); 
                else rundeErtrag.blut += (wertung * metaMultiBoese); 
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

        let freiesVolumen = Math.max(0, 5 - getSlotVolumen(schlachtfeld[i])); 
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
            punkt.innerText = e.typ ? e.typ.charAt(0).toUpperCase() : "?";
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

    ['ritter', 'bogenschuetze', 'priester'].forEach(u => {
        let btn = document.getElementById('btn-' + u);
        if (btn) btn.disabled = (daten.gut.res < getKosten(u));
        
        let txt = document.getElementById('txt-' + u);
        if (txt) txt.innerText = `${einheitenStats[u].typ}-Kaserne (${getKosten(u)}) | Gebaut: ${daten.gut.kasernen[u]} [${Math.floor(produktionProgress[u] * 100)}%]`;
        
        let tt = document.getElementById('tt-' + u);
        if (tt) tt.innerHTML = generiereTooltip(einheitenStats[u]);
    });

    ['skelett', 'oger'].forEach(u => {
        let btn = document.getElementById('btn-' + u);
        if (btn) btn.disabled = (daten.boese.res < getKosten(u));
        
        let txt = document.getElementById('txt-' + u);
        if (txt) txt.innerText = `${einheitenStats[u].typ}-Kaserne (${getKosten(u)}) | Gebaut: ${daten.boese.kasernen[u]} [${Math.floor(produktionProgress[u] * 100)}%]`;
        
        let tt = document.getElementById('tt-' + u);
        if (tt) tt.innerHTML = generiereTooltip(einheitenStats[u]);
    });
} // <-- Hier endet deine updateUI() Funktion

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
        case 'Q': kaufeKaserne('ritter'); break;
        case 'W': kaufeKaserne('bogenschuetze'); break;
        case 'E': kaufeKaserne('priester'); break; 
        case 'I': kaufeKaserne('skelett'); break;
        case 'O': kaufeKaserne('oger'); break;
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
}

function schließeShop() {
    document.getElementById('shop-modal').classList.add('shop-hidden');
    spielPausiert = false; // Spiel läuft weiter!
}
