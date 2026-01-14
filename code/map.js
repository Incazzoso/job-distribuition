import { getTuttiGliOccupati } from './istat_API.js';

/**
 * CONFIGURAZIONE GENERALE
 * Coordinate, zoom e percorsi file
 */
const CONFIG = {
    mapCenter: [41.9, 12.5],
    minZoom: 6,
    boundsItalia: [[35.5, 6.5], [47.2, 18.5]],
    geoJsonPath: './code/limits_IT_regions.geojson', 
    defaultStyle: { fillColor: '#e0e0e0', weight: 1, color: 'white', fillOpacity: 0.5 }
};

/**
 * STATO DELL'APPLICAZIONE
 * Variabili globali per memorizzare dati e layer
 */
let geoJsonLayer = null;      // Layer Leaflet dei confini regionali
let geoJsonDataCache = null;  // Cache dei dati geografici (GeoJSON)
let coordsRegioni = null;     // Cache delle coordinate per lo zoom

// Riferimenti agli elementi HTML (DOM)
const lavoroInput = document.getElementById('lavoro');
const regioneInput = document.querySelector('input[name="regione"]');
const frequenzaSelect = document.getElementById('frequenza');

/**
 * INIZIALIZZAZIONE MAPPA
 * Configurazione base di Leaflet
 */
const map = L.map('map', {
    maxBounds: CONFIG.boundsItalia,
    maxBoundsViscosity: 1.0,
    minZoom: CONFIG.minZoom,
}).setView(CONFIG.mapCenter, CONFIG.minZoom);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

/**
 * LOGICA COLORE MATEMATICA (INTENSITÀ)
 * Calcola il colore basandosi sul rapporto tra valore attuale e valore massimo.
 * @param {number} valore - Numero lavoratori o percentuale
 * @param {number} maxValore - Il valore più alto trovato nel set di dati attuale
 */
function getIntenseColor(valore, maxValore) {
    if (!valore || valore === 0) return '#e0e0e0';

    // Calcolo del rapporto (da 0 a 1)
    const ratio = Math.min(valore / maxValore, 1);
    
    // Utilizziamo HSL per gestire l'intensità tramite la luminosità (Lightness)
    // Tonalità 260 (Viola), Saturazione 70%
    // La luminosità va da 90% (molto chiaro) a 30% (molto scuro/intenso)
    const lightness = 90 - (ratio * 60); 
    
    return `hsl(260, 70%, ${lightness}%)`;
}

/**
 * GESTIONE DATI E POPUP
 * Normalizzazione codici e integrazione dati/geografia
 */
const normalizeIstatCode = (code) => code ? String(code).padStart(2, '0') : null;

function onEachFeature(feature, layer, maxValore) {
    const nomeRegione = feature.properties.reg_name || "N/A";
    const valore = feature.properties.densita_lavoro || 0;
    const isPercentuale = frequenzaSelect.value === "Percentuale";
    const lavoro = lavoroInput.value || 'Dato';

    const etichetta = isPercentuale ? `${valore.toFixed(2)}%` : valore.toLocaleString('it-IT');
    layer.bindPopup(`<strong>${nomeRegione}</strong><br>${lavoro}: ${etichetta}`);
}

function integrateData(geoJson, istatResults) {
    const densitaLookup = Object.fromEntries(
        istatResults.map(item => [normalizeIstatCode(item.codiceRegione), item.valore])
    );

    return {
        ...geoJson,
        features: geoJson.features.map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                densita_lavoro: densitaLookup[normalizeIstatCode(feature.properties.reg_istat_code_num)] || 0
            }
        }))
    };
}

/**
 * FUNZIONI DI INTERFACCIA (ZOOM & UPDATE)
 */
function zoomToRegione() {
    const nomeRegione = regioneInput.value;
    if (!nomeRegione || nomeRegione === "Tutte le regioni") {
        map.setView(CONFIG.mapCenter, CONFIG.minZoom);
        return;
    }
    if (coordsRegioni && coordsRegioni[nomeRegione]) {
        map.setView(coordsRegioni[nomeRegione], 8);
    }
}

async function updateMap() {
    if (!geoJsonDataCache) return;
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);

    const selectedLavoro = lavoroInput.value;
    const isPercentuale = frequenzaSelect.value === "Percentuale";

    if (!selectedLavoro) {
        renderLayer(geoJsonDataCache, () => CONFIG.defaultStyle);
        return;
    }

    try {
        const codiciRegione = geoJsonDataCache.features.map(f => f.properties.reg_istat_code_num);
        let istatResults = await getTuttiGliOccupati(codiciRegione, selectedLavoro);

        // Calcolo Percentuale se richiesto
        if (isPercentuale && istatResults.length > 0) {
            const totLavoratori = istatResults.reduce((acc, curr) => acc + curr.valore, 0);
            istatResults = istatResults.map(item => ({
                ...item,
                valore: totLavoratori > 0 ? (item.valore / totLavoratori) * 100 : 0
            }));
        }

        // Calcolo del valore massimo per l'intensità del colore
        const maxValore = Math.max(...istatResults.map(o => o.valore), 1);
        const geoJsonConDati = integrateData(geoJsonDataCache, istatResults);

        // Rendering con stile basato sull'intensità matematica
        geoJsonLayer = L.geoJSON(geoJsonConDati, {
            style: (feature) => ({
                fillColor: getIntenseColor(feature.properties.densita_lavoro, maxValore),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.8
            }),
            onEachFeature: (f, l) => onEachFeature(f, l, maxValore)
        }).addTo(map);

    } catch (error) {
        console.error("Errore updateMap:", error);
    }
}

function renderLayer(data, styleFn) {
    geoJsonLayer = L.geoJSON(data, {
        style: styleFn,
        onEachFeature: (f, l) => onEachFeature(f, l, 1)
    }).addTo(map);
}

/**
 * AVVIO DELL'APPLICAZIONE
 */
async function initialize() {
    try {
        // Caricamento asincrono risorse
        const [resGeo, resCoords] = await Promise.all([
            fetch(CONFIG.geoJsonPath),
            fetch('./code/coords_regioni.json')
        ]);

        if (!resGeo.ok) throw new Error("Errore GeoJSON");
        
        geoJsonDataCache = await resGeo.json();
        if (resCoords.ok) coordsRegioni = await resCoords.json();

        // Setup Event Listeners
        lavoroInput.addEventListener('input', updateMap); 
        regioneInput.addEventListener('input', zoomToRegione);
        frequenzaSelect.addEventListener('change', updateMap);

        updateMap();
        console.log("Mappa Lavorix pronta.");
    } catch (error) {
        console.error("Errore inizializzazione:", error);
    }
}

initialize();