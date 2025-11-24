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
const MAX_DENSITA = 10000; // Valore stimato (aggiusta in base ai dati ISTAT reali)

function getColor(d) {
    return d > 5000 ? '#800026' :
            d > 2000 ? '#BD0026' :
            d > 800  ? '#E31A1C' :
            d > 200  ? '#d47846ff' :
            d > 50   ? '#FEB24C' :
            d > 50   ? '#FFEDA0':
            '#ffffffff';
}

function style(feature) {
    const densita = feature.properties.densita_lavoro || 0; 
    return {
        fillColor: getColor(densita),
        weight: 1,
        opacity: 0.3,
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

// --- Logica di Integrazione Dati ---

function integrateData(geoJson, istatResults) {
    const densitaLookup = {};
    istatResults.forEach(item => {
        // La chiave è il codice regione numerico ISTAT
        densitaLookup[item.codiceRegione] = item.valore; 
    });

    const featuresWithData = geoJson.features.map(feature => {
        // *** CAMBIATO QUI: usa il codice ISTAT numerico del GeoJSON ***
        const codiceNumerico = feature.properties.reg_istat_code_num; 
        
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
        // Disegna i contorni base (grigio) se i dati non sono pronti o il lavoro non è selezionato
        geoJsonLayer = L.geoJSON(geoJsonDataCache || [], { 
            style: { fillColor: '#CCCCCC', weight: 1, color: 'white', fillOpacity: 0.5 },
            onEachFeature: onEachFeature // Usa la funzione per mostrare il messaggio "Seleziona un lavoro"
        }).addTo(map);
        return;
    }

    // Estrae i codici numerici ISTAT per le regioni
    const codiciRegioneNumerici = geoJsonDataCache.features.map(f => f.properties.reg_istat_code_num);

    try {
        // Chiamata asincrona veloce per tutti i dati in parallelo
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