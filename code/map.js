// map.js
import { getTuttiGliOccupati } from './istat_API.js'; 

// Configurazione Iniziale
const boundsItalia = [
    [35.5, 6.5],
    [47.2, 18.5]
];
const map = L.map('map', {
    maxBounds: boundsItalia,
    maxBoundsViscosity: 1.0,
    minZoom: 6,
}).setView([41.9, 12.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geoJsonLayer = null; 
let geoJsonDataCache = null; // Cache per i poligoni
const lavoroDropdown = document.getElementById('lavoro');

// --- Funzioni di Stile ---
const MAX_DENSITA = 600000; 

function getColor(d) {
    return d > 300000 ? '#4a1486' : // Viola scuro (altissima densità)
           d > 150000 ? '#6a51a3' : // Viola medio
           d > 80000  ? '#8c6bb1' : // Viola chiaro
           d > 40000  ? '#a785c9' : // Lilla
           d > 20000  ? '#d4b9da' : // Lilla molto chiaro
           d > 10000  ? '#f2f0f7' : // Grigio/bianco (media-bassa densità)
           d > 5000   ? '#deebf7' : // Azzurro chiaro
           d > 1000   ? '#c6dbef' : // Azzurro medio
           d > 500    ? '#9ecae1' : // Azzurro scuro
                        '#e0e0e0';   // Grigio (bassissima densità / 0)
}

function style(feature) {
    const densita = feature.properties.densita_lavoro || 0; 
    return {
        fillColor: getColor(densita),
        weight: 1,
        opacity: 1, 
        color: 'white',
        fillOpacity: 0.8
    };
}

function onEachFeature(feature, layer) {
    const nomeRegione = feature.properties.reg_name;
    const densita = feature.properties.densita_lavoro !== undefined ? 
                    feature.properties.densita_lavoro.toLocaleString('it-IT') : 'N.D.'; 
    const lavoro = lavoroDropdown.value || 'Nessun lavoro selezionato';
    
    layer.bindPopup(
        `<b>${nomeRegione}</b><br>Occupati (${lavoro}): ${densita}`
    );
}

// --- Funzione di Normalizzazione ISTAT (NUOVA) ---

function normalizeIstatCode(code) {
    // Garantisce che il codice sia una stringa di 2 cifre (es. 1 -> "01", 18 -> "18")
    if (code === null || code === undefined) return null;
    return String(code).padStart(2, '0');
}

// --- Logica di Integrazione Dati ---

function integrateData(geoJson, istatResults) {
    const densitaLookup = {};
    istatResults.forEach(item => {
        // Normalizziamo la chiave del JSON di simulazione (es. "3" o "03" -> "03")
        const normalizedCode = normalizeIstatCode(item.codiceRegione);
        densitaLookup[normalizedCode] = item.valore; 
    });

    const featuresWithData = geoJson.features.map(feature => {
        // Normalizziamo la chiave del GeoJSON (es. 3 o "3" o "03" -> "03")
        // Il campo è reg_istat_code_num
        const codiceNumerico = normalizeIstatCode(feature.properties.reg_istat_code_num); 
        
        // Ora il matching avviene sulla chiave normalizzata ("01", "03", ecc.)
        const densita = densitaLookup[codiceNumerico] || 0;
        
        // Creazione di un nuovo oggetto properties per evitare mutazioni
        return { 
            ...feature, 
            properties: { ...feature.properties, densita_lavoro: densita } 
        };
    });

    return { ...geoJson, features: featuresWithData };
}

// --- Funzione di Aggiornamento Mappa ---

async function updateMap() {
    // Rimuove il vecchio layer se esiste
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    
    const selectedProfessione = lavoroDropdown.value;

    if (!selectedProfessione || !geoJsonDataCache) {
        // Disegna i contorni base (grigio)
        geoJsonLayer = L.geoJSON(geoJsonDataCache || [], { 
            style: { fillColor: '#CCCCCC', weight: 1, color: 'white', fillOpacity: 0.5 },
            onEachFeature: onEachFeature
        }).addTo(map);
        return;
    }

    // Estrae i codici numerici ISTAT per le regioni
    const codiciRegioneNumerici = geoJsonDataCache.features.map(f => f.properties.reg_istat_code_num);

    try {
        // Chiamata asincrona per i dati (da istat_API.js)
        const istatResults = await getTuttiGliOccupati(codiciRegioneNumerici, selectedProfessione);
        
        // Integra e prepara il GeoJSON per la visualizzazione
        const geoJsonConDati = integrateData(geoJsonDataCache, istatResults);

        // Disegna la nuova mappa coropleta
        geoJsonLayer = L.geoJSON(geoJsonConDati, {
            style: style, 
            onEachFeature: onEachFeature
        }).addTo(map);
        
    } catch (error) {
        console.error("Errore durante il recupero o rendering dei dati:", error);
        // Fallback: Disegna la mappa in grigio in caso di errore
        geoJsonLayer = L.geoJSON(geoJsonDataCache, { 
            style: { fillColor: '#CCCCCC', weight: 1, color: 'white', fillOpacity: 0.5 },
            onEachFeature: (feature, layer) => layer.bindPopup(`<b>${feature.properties.reg_name}</b><br>Dati ISTAT non disponibili.`)
        }).addTo(map);
    }
}

// --- Avvio Iniziale ---

async function initialize() {
    try {
        // Carica il GeoJSON una sola volta
        const geoJsonResponse = await fetch('../code/limits_IT_regions.geojson');
        if (!geoJsonResponse.ok) {
            throw new Error(`Impossibile caricare il GeoJSON. Controlla il percorso: Status ${geoJsonResponse.status}`);
        }
        geoJsonDataCache = await geoJsonResponse.json();

        // Collega l'evento al selettore di lavoro
        lavoroDropdown.addEventListener('change', updateMap);
        
        // Disegna la mappa iniziale (sarà grigia finché non si seleziona un lavoro)
        await updateMap(); 

    } catch (error) {
        console.error("Errore fatale nell'inizializzazione della mappa:", error);
    }
}

initialize();