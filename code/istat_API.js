/**
 * istat_API.js
 * Gestisce il recupero dei dati occupazionali (simulati).
 */

let simulatedData = null;

/**
 * Carica il file JSON dei dati simulati una sola volta (Singleton).
 */
async function loadSimulatedData() {
    if (simulatedData) return simulatedData;

    try {
        const response = await fetch('./code/simulated_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        simulatedData = await response.json();
        return simulatedData;
    } catch (error) {
        console.error("Errore nel caricamento del JSON di simulazione:", error);
        return null; // Ritorna null per segnalare un errore di caricamento
    }
}

/**
 * Recupera i dati degli occupati per una specifica professione.
 * @param {Array} _codiciRegioneNumerici - (Non usato nel mock, mantenuto per compatibilità futura)
 * @param {string} professioneNome - Nome della professione da cercare nel JSON
 * @returns {Promise<Array>} Array di oggetti {codiceRegione, valore}
 */
export async function getTuttiGliOccupati(_codiciRegioneNumerici, professioneNome) {
    if (!professioneNome) return [];

    const data = await loadSimulatedData();

    // Gestione caso in cui il file non sia stato caricato o la professione manchi
    if (!data || !data[professioneNome]) {
        console.warn(`Dati non disponibili per: ${professioneNome}`);
        return [];
    }

    // Restituisce i dati assicurandosi che il codiceRegione sia una stringa
    // Usiamo .map per garantire l'integrità dei dati uscenti
    return data[professioneNome].map(item => ({
        codiceRegione: String(item.codiceRegione),
        valore: Number(item.valore) || 0
    }));
}