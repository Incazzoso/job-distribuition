// istat_API.js

/**
 * Mappa di traduzione: Nome Professione (da HTML) -> Codice CP2011 (Livello 1) per ISTAT SDMX
 * * Codici CP2011 (Livello 1):
 * 1 = Legislatori, imprenditori e alta dirigenza
 * 2 = Professioni intellettuali, scientifiche e di elevata specializzazione
 * 3 = Professioni tecniche
 * 4 = Impiegati, professioni esecutive
 * 5 = Professioni qualificate nelle attività commerciali e nei servizi
 * 6 = Agricoltori e operai agricoli specializzati
 * 7 = Artigiani, operai specializzati e installatori/manutentori
 * 8 = Conduttori di impianti e macchinari, assemblatori
 * 9 = Professioni non qualificate
 */
const professioneCodici = {
    // Codice 1 (Dirigenza / Imprenditoria)
    "Imprenditore": "1",
    "Manager": "1",
    
    // Codice 2 (Specialisti di alto livello, Scienza, Legge, Salute, Istruzione)
    "Agronomo": "2",
    "Architetto": "2",
    "Avvocato": "2",
    "Commercialista": "2",
    "Dentista": "2",
    "Enologo": "2",
    "Farmacista": "2",
    "Giornalista": "2",
    "Ingegnere": "2",
    "Insegnante": "2", // Tipicamente Istruzione Secondaria/Superiore
    "Medico": "2",
    "Notaio": "2",
    "Pilota": "2", // Professioni con alta specializzazione
    "Professore Universitario": "2",
    "Programmatore": "2",
    "Psicologo": "2",
    "Veterinario": "2",

    // Codice 3 (Professioni tecniche)
    "Contabile": "3",
    "Tecnico Informatico": "3",
    "Web Designer": "3", 
    "Infermiere": "3", // Professioni Sanitarie qualificate

    // Codice 4 (Impiegati, professioni esecutive)
    "Impiegato Amministrativo": "4",
    "Segretario": "4",
    
    // Codice 5 (Commerciali, Servizi, Forza pubblica)
    "Barista": "5",
    "Cassiera": "5",
    "Commessa": "5",
    "Commerciante": "5",
    "Cuoco": "5",
    "Fiorista": "5",
    "Fotografo": "5",
    "Macellaio": "5",
    "Ottico": "5",
    "Panettiere": "5",
    "Parrucchiere": "5",
    "Pasticciere": "5",
    "Poliziotto": "5", // Esecutori di ordini
    "Store Manager": "5",
    "Visual Merchandiser": "5",
    
    // Codice 6 (Agricoltori e Operai Agricoli)
    "Agricoltore": "6",
    "Trattorista": "6",
    
    // Codice 7 (Artigiani e Operai Specializzati)
    "Elettricista": "7",
    "Idraulico": "7",
    "Muratore": "7",
    "Saldatore": "7",
    
    // Codice 8 (Conduttori di Impianti e Macchinari)
    "Operaio": "8", // Assumiamo Conduttore di macchinari o assemblatore
    "Magazziniere": "8", // Spesso rientra qui o nel 9 a seconda del ruolo
    
    // Codice 9 (Professioni non qualificate)
    "Postino": "9",
};

async function fetchOccupatiSingolaRegione(regioneCodiceNumerico, professioneNome) {
    const codiceISTAT_CP = professioneCodici[professioneNome];

    if (!codiceISTAT_CP) {
        throw new Error(`Codice ISTAT non mappato per la professione: ${professioneNome}`);
    }
    
    // Endpoint LFS richiede il codice regione (es. 01, 02) E il codice professione (es. 2, 5)
    const url = `https://sdmx.istat.it/SDMXWS/rest/data/LFS/REGION.${regioneCodiceNumerico}.PROFESSIONE.${codiceISTAT_CP}.TIPO_DATO.OCC.SEX.T.ETA.TOTAL?startPeriod=2022&endPeriod=2022&format=json`;    
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Errore fetch ISTAT per codice ${regioneCodiceNumerico} e professione ${professioneNome}: Status ${res.status}`);
    }
    const json = await res.json();

    const observations = json.dataSets[0].observations;
const keys = Object.keys(observations);

    if (keys.length === 0) {
        // Nessuna osservazione trovata. Restituisce array vuoto per default=0.
        return []; 
    }

    // L'osservazione è contenuta nella prima chiave trovata.
    // Il valore ISTAT è quasi sempre il primo elemento [0] dell'array observation.
    const valoreStringa = observations[keys[0]][0];
    
    // Tentativo di parsing del valore
    const valoreNumerico = parseFloat(valoreStringa);

    if (isNaN(valoreNumerico)) {
        console.warn(`Valore ISTAT non numerico per ${regioneCodiceNumerico}, ${professioneNome}. Valore letto: ${valoreStringa}`);
        return []; // Trattalo come zero se non è un numero valido
    }

    // Restituisce l'unico risultato trovato
    return [{ 
        codiceRegione: regioneCodiceNumerico, 
        valore: valoreNumerico
    }];
}


export async function getTuttiGliOccupati(codiciRegioneNumerici, professioneNome) {
    if (!professioneNome) return []; 

    const promises = codiciRegioneNumerici.map(codice => 
        fetchOccupatiSingolaRegione(codice, professioneNome)
            .catch(error => {
                console.warn(`Skipping data for region ${codice}:`, error.message);
                return []; 
            })
    );

    const allResults = await Promise.all(promises);
    return allResults.flat(); 
}