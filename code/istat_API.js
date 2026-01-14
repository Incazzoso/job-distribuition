let simulatedData = null;

async function loadSimulatedData() {
    if (simulatedData) return simulatedData;

    try {
        const response = await fetch('./code/simulated_data.json'); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        simulatedData = await response.json();
        return simulatedData;
    } catch (error) {
        console.error("Errore nel caricamento del JSON di simulazione:", error);
        return null;
    }
}

export async function getTuttiGliOccupati(_codiciRegioneNumerici, professioneNome) {
    if (!professioneNome) return [];

    const data = await loadSimulatedData();

    if (!data || !data[professioneNome]) {
        return [];
    }

    return data[professioneNome].map(item => ({
        codiceRegione: String(item.codiceRegione),
        valore: Number(item.valore) || 0
    }));
}