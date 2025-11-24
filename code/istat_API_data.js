fetch("https://sdmx.istat.it/SDMXWS/rest/data/LFS/REGION.LOM?startPeriod=2023&endPeriod=2023&format=json")
    .then(res => res.json())
    .then(data => {
    console.log(data); // dati ISTAT in JSON
});