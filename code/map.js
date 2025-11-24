import { getOccupati } from './istat_API.js';

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

fetch('../code/limits_IT_regions.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: "#3388ff",
                weight: 2
            },
            onEachFeature: async function (feature, layer) {
                const codiceRegione = feature.properties.cod_reg; // es. "LOM"
                try {
                    const dati = await getOccupati(codiceRegione);
                    // esempio: prendo la prima professione
                    const occupati = dati[0].valore;
                    layer.bindPopup(
                        `${feature.properties.reg_name}<br>Occupati: ${occupati}`
                    );
                } catch (err) {
                    console.error(err);
                    layer.bindPopup(`${feature.properties.reg_name}<br>Dati non disponibili`);
                }
            }
        }).addTo(map);
    });