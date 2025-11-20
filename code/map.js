const map = L.map('map').setView([41.9, 12.5], 6);


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geojson;

fetch('../code/limits_IT_regions.geojson')
    .then(response => response.json())
    .then(data => {
    L.geoJSON(data, {
            style: {
            color: "#3388ff",
            weight: 2
        },
    onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.reg_name);
        }
    }).addTo(map);
});