import { getTuttiGliOccupati } from './istat_API.js';

// --- CONFIGURAZIONE ---
const CONFIG = {
    mapCenter: [41.9, 12.5],
    minZoom: 6,
    boundsItalia: [[35.5, 6.5], [47.2, 18.5]],
    geoJsonPath: './code/limits_IT_regions.geojson',
    defaultStyle: { fillColor: '#e0e0e0', weight: 1, color: 'white', fillOpacity: 0.5 }
};

// --- STATO DELL'APPLICAZIONE ---
let geoJsonLayer = null;
let geoJsonDataCache = null;

const lavoroDropdown = document.getElementById('lavoro');

// --- INIZIALIZZAZIONE MAPPA ---
const map = L.map('map', {
    maxBounds: CONFIG.boundsItalia,
    maxBoundsViscosity: 1.0,
    minZoom: CONFIG.minZoom,
}).setView(CONFIG.mapCenter, CONFIG.minZoom);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// --- LOGICA COLORI ---
function getColor(d) {
    if (!d || d === 0) return '#e0e0e0';
    return d > 300000 ? '#4a1486' :
        d > 150000 ? '#6a51a3' :
        d > 80000  ? '#8c6bb1' :
        d > 40000  ? '#a785c9' :
        d > 20000  ? '#d4b9da' :
        d > 10000  ? '#f2f0f7' :
        d > 5000   ? '#deebf7' :
        d > 1000   ? '#c6dbef' :
                        '#9ecae1';
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

// --- UTILITY ---
const normalizeIstatCode = (code) => code ? String(code).padStart(2, '0') : null;

// --- GESTIONE DATI ---
function onEachFeature(feature, layer) {
    const nomeRegione = feature.properties.reg_name;
    const densita = feature.properties.densita_lavoro;
    const densitaFormattata = (densita !== undefined && densita !== 0) ? densita.toLocaleString('it-IT') : 'Dato non disponibile';
    const lavoro = lavoroDropdown.options[lavoroDropdown.selectedIndex]?.text || 'Selezionato';

    layer.bindPopup(`<strong>${nomeRegione}</strong><br>${lavoro}: ${densitaFormattata}`);
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

// --- AGGIORNAMENTO UI ---
async function updateMap() {
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);

    const selectedValue = lavoroDropdown.value;

    // Se non c'è selezione, mostra mappa neutra
    if (!selectedValue || !geoJsonDataCache) {
        renderLayer(geoJsonDataCache, CONFIG.defaultStyle);
        return;
    }

    try {
        const codiciRegione = geoJsonDataCache.features.map(f => f.properties.reg_istat_code_num);
        const istatResults = await getTuttiGliOccupati(codiciRegione, selectedValue);
        const geoJsonConDati = integrateData(geoJsonDataCache, istatResults);
        
        renderLayer(geoJsonConDati, style);
    } catch (error) {
        console.error("Errore updateMap:", error);
        renderLayer(geoJsonDataCache, CONFIG.defaultStyle);
    }
}

function renderLayer(data, styleObject) {
    geoJsonLayer = L.geoJSON(data, {
        style: styleObject,
        onEachFeature: onEachFeature
    }).addTo(map);
}

// --- AVVIO ---
async function initialize() {
    try {
        const response = await fetch(CONFIG.geoJsonPath);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        geoJsonDataCache = await response.json();
        
        lavoroDropdown.addEventListener('change', updateMap);
        updateMap(); // Primo render

    } catch (error) {
        console.error("Errore inizializzazione:", error);
        alert("Errore nel caricamento dei confini regionali.");
    }
}

initialize();