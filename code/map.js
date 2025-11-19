const map = L.map('map').setView([42.5, 12.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

fetch('limits_IT_regions.geojson')
    .then(res => res.json())
    .then(data => {
    L.geoJSON(data, {
        style: feature => ({
        color: '#333',
        fillColor: '#66ccff',
        fillOpacity: 0.5
        }),
            onEachFeature: (feature, layer) => {
            layer.bindPopup(`<strong>${feature.properties.nome}</strong>`);
        }
    }).addTo(map);
});