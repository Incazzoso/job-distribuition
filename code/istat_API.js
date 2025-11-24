// istat_API.js
export async function getOccupati(regioneCodice) {
    const url = `https://sdmx.istat.it/SDMXWS/rest/data/LFS/REGION.${regioneCodice}?startPeriod=2023&endPeriod=2023&format=json`;
    const res = await fetch(url);
    const json = await res.json();

    const observations = json.dataSets[0].observations;
    const dimensions = json.structure.dimensions.observation;

    const results = [];
    for (let key in observations) {
        const value = observations[key][0];
        const indices = key.split(":");

        const regione = dimensions[0].values[indices[0]].name;
        const professione = dimensions[1].values[indices[1]].name;
        const anno = dimensions[2].values[indices[2]].id;

        results.push({ regione, professione, anno, valore: value });
    }
    return results;
}