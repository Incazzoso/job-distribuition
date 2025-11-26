// istat_API.js

// Nota: la mappa professioneCodici non è più usata ma la lascio per completezza
const professioneCodici = {
    "Agricoltore": "6", 
    "Trattorista": "6",
    "Ingegnere": "2",
    "Programmatore": "2",
    "Architetto": "2",
    "Operaio": "8",
    "Commessa": "5",
    "Pilota": "2",
    // DEVI COMPLETARE TUTTI GLI ALTRI LAVORI QUI!
};

let simulatedData = null;

async function loadSimulatedData() {
    if (simulatedData) return simulatedData;
    try {
        // Assicurati che il percorso al file JSON sia corretto!
        // Presumibilmente '../code/simulated_data.json' se il file è in una cartella 'code'
        const response = await fetch('../code/simulated_data.json'); 
        if (!response.ok) {
            throw new Error(`Errore nel caricamento dei dati simulati: Status ${response.status}`);
        }
        simulatedData = await response.json();
        return simulatedData;
    } catch (error) {
        console.error("Errore fatale nel caricamento del JSON di simulazione:", error);
        return {};
    }
}


export async function getTuttiGliOccupati(codiciRegioneNumerici, professioneNome) {
    if (!professioneNome) return []; 
    
    // 1. Carica i dati simulati
    const data = await loadSimulatedData();

    // 2. Cerca il risultato per la professione selezionata
    // Il JSON è strutturato: { "NomeLavoro": [ {codiceRegione: "03", valore: 12345}, ... ] }
    const results = data[professioneNome];

    if (!results) {
        console.warn(`Dati simulati non trovati per la professione: ${professioneNome}.`);
        return [];
    }
    
    // 3. Restituisce i dati così come sono. 
    // La logica di matching e normalizzazione ISTAT è spostata in map.js.
    return results.map(item => ({
        // Assicurati solo che il codice sia sempre una stringa
        codiceRegione: String(item.codiceRegione), 
        valore: item.valore 
    }));
}