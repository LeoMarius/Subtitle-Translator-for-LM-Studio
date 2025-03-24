// Fordítási funkciók

// Egy felirat újrafordítása
async function retranslateSubtitle(index, {
    rowsBeingRetranslated,
    sourceLanguageSelect,
    targetLanguageSelect,
    temperatureSlider,
    translationModeSelect,
    apiKeyInput,
    originalSubtitles,
    translatedSubtitles,
    translationMemory,
    updateTranslatedText,
    translateWithChatGpt,
    translateTextWithContext,
    saveTranslationBtn,
    saveWorkFileBtn,
    currentLangCode,
    uiTranslations
}) {
    // Ellenőrizzük, hogy fut-e már újrafordítás erre a sorra
    if (rowsBeingRetranslated.has(index)) {
        return;
    }
    
    // Jelezzük, hogy ez a sor újrafordítás alatt áll
    rowsBeingRetranslated.add(index);
    
    // Fordítás gomb állapotának módosítása
    const retranslateBtn = document.getElementById(`retranslate-${index}`);
    if (retranslateBtn) {
        retranslateBtn.disabled = true;
        retranslateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    // Nyelvi beállítások
    const sourceLanguage = sourceLanguageSelect.value;
    const targetLanguage = targetLanguageSelect.value;
    
    // Hőmérséklet beállítás
    const temperature = parseFloat(temperatureSlider.value);
    
    // Fordítási mód ellenőrzése
    const selectedMode = translationModeSelect.value;
    const apiKey = apiKeyInput.value;

    try {
        let translatedText = '';
        
        // A kiválasztott fordítási mód alapján hívjuk meg a megfelelő fordítási függvényt
        if (selectedMode === 'chatgpt_4o_mini' || selectedMode === 'chatgpt_4o') {
            // Ellenőrizzük, hogy van-e API kulcs
            if (!apiKey) {
                alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use ChatGPT!');
                return;
            }
            
            // ChatGPT modell kiválasztása
            const model = selectedMode === 'chatgpt_4o_mini' ? 'gpt-4o-mini' : 'gpt-4o';
            
            // ChatGPT fordítás
            translatedText = await translateWithChatGpt(
                originalSubtitles[index].text,
                sourceLanguage,
                targetLanguage,
                apiKey,
                model,
                temperature
            );
        } else if (selectedMode.startsWith('openrouter_')) {
            // Ellenőrizzük, hogy van-e API kulcs
            if (!apiKey) {
                alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use OpenRouter API!');
                return;
            }
            
            // Kontextus összeállítása (előző és következő mondatok)
            const currentSubtitle = originalSubtitles[index].text;
            
            // Előző 4 mondat összegyűjtése (ha van)
            let previousContext = "";
            for (let j = Math.max(0, index - 4); j < index; j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    previousContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Következő 4 mondat összegyűjtése (ha van)
            let nextContext = "";
            for (let j = index + 1; j < Math.min(originalSubtitles.length, index + 5); j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    nextContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Egyedi azonosító a fordítandó sorhoz
            const uniqueMarker = "###FORDÍTANDÓ_SOR###";
            const endMarker = "###FORDÍTÁS_VÉGE###";
            
            // Teljes kontextus összeállítása
            let contextText = "";
            if (previousContext) {
                contextText += "Előző sorok kontextusként (NEM kell fordítani):\n" + previousContext + "\n";
            }
            contextText += uniqueMarker + "\n" + currentSubtitle + "\n" + endMarker + "\n";
            if (nextContext) {
                contextText += "Következő sorok kontextusként (NEM kell fordítani):\n" + nextContext;
            }
            
            // Fordítási utasítás
            const systemPrompt = `Fordítsd le CSAK a "${uniqueMarker}" és "${endMarker}" közötti szöveget ${getLanguageNameLocal(sourceLanguage)} nyelvről ${getLanguageNameLocal(targetLanguage)} nyelvre. 
A többi szöveg csak kontextus, azt NE fordítsd le. 
A fordításodban KIZÁRÓLAG a lefordított szöveget add vissza, semmilyen jelölést, magyarázatot vagy egyéb szöveget NE adj hozzá.
NE használd a "${uniqueMarker}" vagy "${endMarker}" jelöléseket a válaszodban.`;
            
            // Modell azonosító kiválasztása a fordítási mód alapján
            let modelId;
            
            if (selectedMode === 'openrouter_gemini_flash') {
                modelId = 'google/gemini-2.0-flash-001';
            } else if (selectedMode === 'openrouter_gemma_27b') {
                modelId = 'google/gemma-3-27b-it:free';
            } else if (selectedMode === 'openrouter_deepseek_r1') {
                modelId = 'deepseek/deepseek-r1:free';
            } else if (selectedMode === 'openrouter_gemini_pro') {
                modelId = 'google/gemini-2.0-pro-exp-02-05:free';
            } else if (selectedMode === 'openrouter_deepseek_v3') {
                modelId = 'deepseek/deepseek-chat:free';
            } else if (selectedMode === 'openrouter_llama_70b') {
                modelId = 'meta-llama/llama-3.1-70b-instruct';
            } else if (selectedMode === 'openrouter_gpt4o_mini') {
                modelId = 'openai/gpt-4o-mini';
            } else {
                // Alapértelmezett esetben Gemma 3 27B
                modelId = 'google/gemma-3-27b-it:free';
            }
            
            // Fordítás végrehajtása az OpenRouter API-val a kiválasztott modellel
            const rawTranslatedText = await translateWithOpenRouterApi(
                contextText,
                systemPrompt,
                apiKey,
                temperature,
                0,
                modelId
            );
            
            // Fordítás tisztítása
            translatedText = cleanTranslation(rawTranslatedText, uniqueMarker, endMarker);
        } else {
            // LM Studio fordítás
            translatedText = await translateTextWithContext(
                originalSubtitles,
                index,
                sourceLanguage,
                targetLanguage,
                0,
                temperature,
                { getLanguageName: getLanguageNameLocal }
            );
        }
        
        // Fordított szöveg mentése
        translatedSubtitles[index] = translatedText;
        
        // Táblázat frissítése
        updateTranslatedText(index, translatedText);
        
        // Fordítási memória frissítése
        if (!translationMemory.translations) {
            translationMemory.translations = {};
        }
        translationMemory.translations[originalSubtitles[index].text] = translatedText;
        
        // Mentés gomb engedélyezése
        saveTranslationBtn.disabled = false;
        
        // Munkafájl mentés gomb megjelenítése
        saveWorkFileBtn.classList.remove('d-none');
        
    } catch (error) {
        console.error('Újrafordítási hiba:', error);
        alert(`An error occurred during the re-translation: ${error.message}`);
    } finally {
        // Fordítás gomb visszaállítása
        if (retranslateBtn) {
            retranslateBtn.disabled = false;
            retranslateBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>${uiTranslations[currentLangCode]?.retranslate || 'Újrafordítás'}`;
            retranslateBtn.classList.remove('d-none');
        }
        
        // Töröljük a sort az újrafordítás alatt állók közül
        rowsBeingRetranslated.delete(index);
    }
}

// Szekvenciális fordítás a ChatGPT API-val
async function translateSequentially(startIndex, sourceLanguage, targetLanguage, apiKey, mode, temperature, {
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef, // Referencia a szüneteltetés változóhoz
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    translateWithChatGptCustomPrompt,
    showCurrentRowStopButton
}) {
    // ChatGPT API kérések közötti késleltetés (ms) - 0.2 másodperc
    const API_DELAY = 200;
    
    // A megfelelő modell kiválasztása
    const model = mode === 'chatgpt_4o_mini' ? 'gpt-4o-mini' : 'gpt-4o';
    
    // Végigmegyünk a feliratokon egyesével, szekvenciálisan
    for (let i = startIndex; i < originalSubtitles.length; i++) {
        // Ha a fordítás szüneteltetése be van kapcsolva, akkor kilépünk a ciklusból
        if (isTranslationPausedRef.value) {
            break;
        }
        
        // Aktuális fordítási index frissítése
        let localCurrentIndex = i;
        
        // Ellenőrizzük, hogy már le van-e fordítva ez a felirat
        if (translatedSubtitles[i]) {
            continue; // Átugorjuk a már lefordított feliratokat
        }
        
        // Folyamatjelző frissítése
        updateProgressBar(i, originalSubtitles.length);
        
        // Megjelenítjük az aktuális sor megállítás gombját
        if (showCurrentRowStopButton) {
            showCurrentRowStopButton(i);
        }
        
        try {
            // Kontextus összeállítása (előző és következő mondatok)
            const currentSubtitle = originalSubtitles[i].text;
            
            // Előző 4 mondat összegyűjtése (ha van)
            let previousContext = "";
            for (let j = Math.max(0, i - 4); j < i; j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    previousContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Következő 4 mondat összegyűjtése (ha van)
            let nextContext = "";
            for (let j = i + 1; j < Math.min(originalSubtitles.length, i + 5); j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    nextContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Egyedi azonosító a fordítandó sorhoz
            const uniqueMarker = "###FORDÍTANDÓ_SOR###";
            const endMarker = "###FORDÍTÁS_VÉGE###";
            
            // Teljes kontextus összeállítása
            let contextText = "";
            if (previousContext) {
                contextText += "Előző sorok kontextusként (NEM kell fordítani):\n" + previousContext + "\n";
            }
            contextText += uniqueMarker + "\n" + currentSubtitle + "\n" + endMarker + "\n";
            if (nextContext) {
                contextText += "Következő sorok kontextusként (NEM kell fordítani):\n" + nextContext;
            }
            
            // Fordítási utasítás
            const systemPrompt = `Fordítsd le CSAK a "${uniqueMarker}" és "${endMarker}" közötti szöveget ${getLanguageNameLocal(sourceLanguage)} nyelvről ${getLanguageNameLocal(targetLanguage)} nyelvre. 
A többi szöveg csak kontextus, azt NE fordítsd le. 
A fordításodban KIZÁRÓLAG a lefordított szöveget add vissza, semmilyen jelölést, magyarázatot vagy egyéb szöveget NE adj hozzá.
NE használd a "${uniqueMarker}" vagy "${endMarker}" jelöléseket a válaszodban.`;
            
            // Segédfüggvény a nyelv kódjának névvé alakításához
            function getLanguageNameLocal(languageCode) {
                const languages = {
                    'en': 'angol',
                    'hu': 'magyar',
                    'de': 'német',
                    'fr': 'francia',
                    'es': 'spanyol',
                    'it': 'olasz',
                    'pt': 'portugál',
                    'ru': 'orosz',
                    'ja': 'japán',
                    'zh': 'kínai',
                    'ko': 'koreai',
                    'ar': 'arab',
                    'hi': 'hindi',
                    'tr': 'török',
                    'pl': 'lengyel',
                    'nl': 'holland',
                    'sv': 'svéd',
                    'da': 'dán',
                    'fi': 'finn',
                    'no': 'norvég',
                    'cs': 'cseh',
                    'sk': 'szlovák',
                    'ro': 'román',
                    'bg': 'bolgár',
                    'hr': 'horvát',
                    'sr': 'szerb',
                    'uk': 'ukrán',
                    'el': 'görög',
                    'he': 'héber',
                    'vi': 'vietnámi',
                    'th': 'thai',
                    'id': 'indonéz',
                    'ms': 'maláj',
                    'fa': 'perzsa',
                    'ur': 'urdu'
                };
                
                return languages[languageCode] || languageCode;
            }
            
            // Fordítás végrehajtása
            const translatedText = await translateWithChatGptCustomPrompt(contextText, systemPrompt, apiKey, model, temperature);
            
            // Fordított szöveg mentése
            translatedSubtitles[i] = translatedText.trim();
            
            // Táblázat frissítése
            updateTranslatedText(i, translatedText.trim());
            
            // Fordítási memória frissítése
            if (!translationMemory.translations) {
                translationMemory.translations = {};
            }
            translationMemory.translations[originalSubtitles[i].text] = translatedText.trim();
            
            // Mentés gomb engedélyezése
            saveTranslationBtn.disabled = false;
            
            // Munkafájl mentés gomb megjelenítése
            saveWorkFileBtn.classList.remove('d-none');
            
            // Újrafordítás gomb megjelenítése
            const retranslateBtn = document.getElementById(`retranslate-${i}`);
            if (retranslateBtn) {
                retranslateBtn.classList.remove('d-none');
            }
            
            // Görgetés az aktuális sorhoz
            scrollToRow(i);
            
            // Kis szünet a következő API kérés előtt, hogy elkerüljük a sebességkorlát-túllépést
            if (i < originalSubtitles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, API_DELAY));
            }
            
        } catch (error) {
            console.error('Fordítási hiba:', error);
            
            // Ha sebességkorlát-túllépés (429) hiba, akkor várunk egy ideig és újra próbáljuk
            if (error.message.includes('429')) {
                console.log('Sebességkorlát-túllépés (429), várakozás 10 másodpercet...');
                alert('We wait 10 seconds for the API speed limit to be exceeded and then continue translating.');
                
                // Várakozás 10 másodpercet
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                // Visszalépünk egy indexet, hogy újra megpróbáljuk ezt a feliratot
                i--;
                continue;
            }
            
            alert(`Error during translation: ${error.message}`);
            pauseTranslation();
            break;
        }
    }
    
    // Visszaadjuk az utolsó feldolgozott indexet
    return localCurrentIndex;
}


// Kötegelt fordítás a ChatGPT modellekkel
async function translateBatchWithChatGpt(startIndex, sourceLanguage, targetLanguage, apiKey, temperature, model, {
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef,
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    showCurrentRowStopButton
}) {
    // Köteg mérete (egyszerre ennyi sort küldünk fordításra)
    const BATCH_SIZE = 30;
    
    // API kérések közötti késleltetés (ms) - 0.5 másodperc
    const API_DELAY = 500;
    
    // Maximum újrapróbálkozások száma sorszám-egyezési hiba esetén
    const MAX_RETRIES = 3;
    
    // Az utolsó feldolgozott index nyomon követése
    let lastProcessedIndex = startIndex;
    
    // Végigmegyünk a feliratokon kötegekben
    for (let batchStart = startIndex; batchStart < originalSubtitles.length; batchStart += BATCH_SIZE) {
        // Ha a fordítás szüneteltetése be van kapcsolva, akkor kilépünk a ciklusból
        if (isTranslationPausedRef.value) {
            break;
        }
        
        // Aktuális köteg végének meghatározása
        const batchEnd = Math.min(batchStart + BATCH_SIZE, originalSubtitles.length);
        
        // Folyamatjelző frissítése
        updateProgressBar(batchStart, originalSubtitles.length);
        
        // Megjelenítjük az aktuális sor megállítás gombját
        if (showCurrentRowStopButton) {
            showCurrentRowStopButton(batchStart);
        }
        
        // Homokóra animáció megjelenítése
        showLoadingOverlay('loadingBatchTranslation');
        
        // Köteg összeállítása
        let batchTexts = "";
        let hasUnprocessedLines = false;
        
        for (let i = batchStart; i < batchEnd; i++) {
            // Csak a még le nem fordított sorokat küldjük el
            if (!translatedSubtitles[i] || translatedSubtitles[i].trim() === '') {
                // Sorszám + szöveg formátumban
                batchTexts += `${i+1}. ${originalSubtitles[i].text}\n`;
                hasUnprocessedLines = true;
            }
        }
        
        // Ha nincs fordítandó szöveg ebben a kötegben, ugrunk a következőre
        if (!hasUnprocessedLines) {
            hideLoadingOverlay();
            continue;
        }
        
        // Fordítási utasítás
        const systemPrompt = `Fordítsd le a következő számozott sorokat ${getLanguageNameLocal(sourceLanguage)} nyelvről ${getLanguageNameLocal(targetLanguage)} nyelvre. 
Minden sort külön fordíts le, és tartsd meg a sorszámozást a fordításban is.
FONTOS: A válaszodban CSAK a lefordított sorokat add vissza a sorszámokkal együtt, pontosan ugyanolyan formátumban és sorszámozással, ahogy megkaptad.
Például ha az input:
123. Eredeti szöveg
124. Másik eredeti szöveg
Akkor a válaszod legyen:
123. Lefordított szöveg
124. Lefordított másik szöveg
NE változtasd meg a sorszámokat! NE kezdd újra a számozást 1-től! Használd pontosan az eredeti sorszámokat!
NE adj hozzá magyarázatot vagy egyéb szöveget.`;

        let retryCount = 0;
        let translationSuccessful = false;
        
        while (retryCount < MAX_RETRIES && !translationSuccessful) {
            try {
                // Fordítás végrehajtása
                const translatedBatch = await translateWithChatGptCustomPrompt(
                    batchTexts,
                    systemPrompt,
                    apiKey,
                    model,
                    temperature,
                    0  // retryCount
                );
                
                // Ellenőrizzük, hogy a visszakapott sorszámok megfelelnek-e az elküldötteknek
                const isNumberingValid = validateLineNumbering(translatedBatch, batchStart);
                
                if (isNumberingValid) {
                    // Fordítás feldolgozása
                    processTranslatedBatch(translatedBatch, batchStart, batchEnd, {
                        translatedSubtitles,
                        updateTranslatedText,
                        translationMemory,
                        originalSubtitles,
                        saveTranslationBtn,
                        saveWorkFileBtn
                    });
                    
                    // Sikeres fordítás
                    translationSuccessful = true;
                } else {
                    // Sorszámozási hiba, újrapróbálkozás
                    console.error(`Sorszámozási hiba a fordításban, újrapróbálkozás (${retryCount + 1}/${MAX_RETRIES})`);
                    
                    // Többnyelvű hibaüzenet
                    const currentLang = currentLangCode || 'hu';
                    const translations = uiTranslations[currentLang] || {};
                    let errorMessage = translations.errorNumberingRetry || `Sorszámozási hiba, újrapróbálkozás ({0}/{1})...`;
                    
                    // Helyőrzők cseréje
                    errorMessage = errorMessage.replace('{0}', retryCount + 1).replace('{1}', MAX_RETRIES);
                    
                    showLoadingOverlay(errorMessage);
                    retryCount++;
                    
                    // Kis szünet az újrapróbálkozás előtt
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error('Kötegelt fordítási hiba:', error);
                
                // Ha sebességkorlát-túllépés (429) hiba, akkor várunk egy ideig és újra próbáljuk
                if (error.message.includes('429')) {
                    console.log('Sebességkorlát-túllépés (429), várakozás 10 másodpercet...');
                    
                    // Többnyelvű hibaüzenet
                    const currentLang = currentLangCode || 'hu';
                    const translations = uiTranslations[currentLang] || {};
                    const errorMessage = translations.errorRateLimitExceeded || 'API sebességkorlát túllépve, várakozás 10 másodpercet...';
                    
                    showLoadingOverlay(errorMessage);
                    
                    // Várakozás 10 másodpercet
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    
                    // Nem számítjuk újrapróbálkozásnak
                    continue;
                }
                
                // Egyéb hiba esetén újrapróbálkozás
                console.error(`Fordítási hiba, újrapróbálkozás (${retryCount + 1}/${MAX_RETRIES})`);
                
                // Többnyelvű hibaüzenet
                const currentLang = currentLangCode || 'hu';
                const translations = uiTranslations[currentLang] || {};
                let errorMessage = translations.errorTranslationRetry || `Fordítási hiba, újrapróbálkozás ({0}/{1})...`;
                
                // Helyőrzők cseréje
                errorMessage = errorMessage.replace('{0}', retryCount + 1).replace('{1}', MAX_RETRIES);
                
                showLoadingOverlay(errorMessage);
                retryCount++;
                
                // Kis szünet az újrapróbálkozás előtt
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Ha minden újrapróbálkozás sikertelen volt
        if (!translationSuccessful) {
            console.error(`Sikertelen fordítás ${MAX_RETRIES} próbálkozás után, továbblépés a következő kötegre.`);
            
            // Többnyelvű hibaüzenet
            const currentLang = currentLangCode || 'hu';
            const translations = uiTranslations[currentLang] || {};
            let errorMessage = translations.errorTranslationFailed || `Sikertelen fordítás {0} próbálkozás után, továbblépés...`;
            
            // Helyőrzők cseréje
            errorMessage = errorMessage.replace('{0}', MAX_RETRIES);
            
            showLoadingOverlay(errorMessage, 2000);
            
            // Kis szünet a következő köteg előtt
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            // Utolsó feldolgozott index frissítése
            lastProcessedIndex = batchEnd - 1;
            
            // Görgetés az utolsó feldolgozott sorhoz
            scrollToRow(lastProcessedIndex);
        }
        
        // Homokóra animáció elrejtése
        hideLoadingOverlay();
        
        // Kis szünet a következő API kérés előtt
        if (batchEnd < originalSubtitles.length) {
            await new Promise(resolve => setTimeout(resolve, API_DELAY));
        }
    }
    
    // Visszaadjuk az utolsó feldolgozott indexet
    return lastProcessedIndex;
}

// Segédfüggvény a sorszámozás ellenőrzéséhez
function validateLineNumbering(translatedBatch, batchStart) {
    // Fordítás feldolgozása soronként
    const lines = translatedBatch.split('\n');
    
    // Ellenőrizzük az első néhány sort (legalább 3-at, ha van annyi)
    const linesToCheck = Math.min(3, lines.length);
    let validLines = 0;
    
    for (let i = 0; i < linesToCheck; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        // Sorszám kinyerése (pl. "123. Szöveg" formátumból)
        const match = line.match(/^(\d+)\.\s*(.*)/);
        if (match) {
            const lineNumber = parseInt(match[1], 10);
            
            // Ellenőrizzük, hogy a sorszám a megfelelő tartományban van-e
            // A sorszám 1-től kezdődik, de a tömb indexek 0-tól, ezért +1
            if (lineNumber >= batchStart + 1) {
                validLines++;
            }
        }
    }
    
    // Ha legalább egy érvényes sort találtunk, és nincs érvénytelen sor, akkor rendben van
    return validLines > 0;
}

// Segédfüggvény a kötegelt fordítás eredményének feldolgozásához
function processTranslatedBatch(translatedBatch, batchStart, batchEnd, {
    translatedSubtitles,
    updateTranslatedText,
    translationMemory,
    originalSubtitles,
    saveTranslationBtn,
    saveWorkFileBtn
}) {
    // Fordítás feldolgozása soronként
    const lines = translatedBatch.split('\n');
    
    for (const line of lines) {
        // Csak a nem üres sorokat dolgozzuk fel
        if (line.trim() === '') continue;
        
        // Sorszám kinyerése (pl. "123. Szöveg" formátumból)
        const match = line.match(/^(\d+)\.\s*(.*)/);
        if (match) {
            const lineNumber = parseInt(match[1], 10);
            const translatedText = match[2].trim();
            
            // Ellenőrizzük, hogy érvényes sorszám-e
            if (lineNumber > 0 && lineNumber <= originalSubtitles.length) {
                // A sorszám 1-től kezdődik, de a tömb indexek 0-tól
                const index = lineNumber - 1;
                
                // Csak akkor frissítjük, ha a köteghez tartozik
                if (index >= batchStart && index < batchEnd) {
                    // Frissítjük a fordított szöveget
                    translatedSubtitles[index] = translatedText;
                    
                    // Frissítjük a táblázatban is
                    updateTranslatedText(index, translatedText);
                    
                    // Frissítjük a fordítási memóriát is
                    if (!translationMemory.translations) {
                        translationMemory.translations = {};
                    }
                    translationMemory.translations[originalSubtitles[index].text] = translatedText;
                    
                    // Újrafordítás gomb megjelenítése
                    const retranslateBtn = document.getElementById(`retranslate-${index}`);
                    if (retranslateBtn) {
                        retranslateBtn.classList.remove('d-none');
                    }
                }
            }
        }
    }
    
    // Mentés gomb engedélyezése
    saveTranslationBtn.disabled = false;
    
    // Munkafájl mentés gomb megjelenítése
    saveWorkFileBtn.classList.remove('d-none');
}

// Segédfüggvény a homokóra animáció megjelenítéséhez adott ideig
function showLoadingOverlay(message, duration = null) {
    // A jelenlegi nyelv alapján választjuk ki a megfelelő üzenetet
    const currentLang = currentLangCode || 'hu';
    const translations = uiTranslations[currentLang] || {};
    
    // Ha a message egy kulcs a fordításokban, akkor használjuk a fordított szöveget
    if (translations[message]) {
        message = translations[message];
    }
    
    // Az alapértelmezett "Betöltés..." szöveg fordítása
    const loadingText = translations.loadingGeneral || "Betöltés...";
    const clickToCloseText = translations.loadingClickToClose || "Kattints bárhova az ablakon kívül a bezáráshoz";
    
    // Ha már létezik, csak frissítjük az üzenetet
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        // Létrehozzuk az overlay elemet
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.cursor = 'pointer'; // Kurzor mutatása, hogy jelezze a kattinthatóságot
        
        // Kattintás eseménykezelő hozzáadása az overlay-hez
        overlay.addEventListener('click', function(event) {
            // Csak akkor rejtjük el, ha közvetlenül az overlay-re kattintottak, nem a tartalomra
            if (event.target === overlay) {
                hideLoadingOverlay();
            }
        });
        
        // Létrehozzuk a tartalom konténert
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.style.color = 'white';
        container.style.padding = '20px';
        container.style.borderRadius = '10px';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        
        // Létrehozzuk a spinner elemet
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-light';
        spinner.setAttribute('role', 'status');
        spinner.style.width = '3rem';
        spinner.style.height = '3rem';
        
        // Létrehozzuk az üzenet elemet
        const messageElement = document.createElement('div');
        messageElement.id = 'loadingMessage';
        messageElement.style.marginTop = '15px';
        messageElement.style.fontSize = '1.2rem';
        messageElement.textContent = message || loadingText;
        
        // Létrehozzuk a bezárás tippet
        const closeTip = document.createElement('div');
        closeTip.style.marginTop = '15px';
        closeTip.style.fontSize = '0.9rem';
        closeTip.style.opacity = '0.7';
        closeTip.textContent = clickToCloseText;
        
        // Összeállítjuk a DOM-ot
        container.appendChild(spinner);
        container.appendChild(messageElement);
        container.appendChild(closeTip);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    } else {
        // Csak frissítjük az üzenetet
        const messageElement = document.getElementById('loadingMessage');
        if (messageElement) {
            messageElement.textContent = message || loadingText;
        }
        
        // Megjelenítjük, ha rejtve volt
        overlay.style.display = 'flex';
    }
    
    // Ha van megadva időtartam, akkor automatikusan elrejtjük
    if (duration) {
        setTimeout(() => {
            hideLoadingOverlay();
        }, duration);
    }
}

// Homokóra animáció elrejtése
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Fordítás az OpenRouter API-val
async function translateWithOpenRouterApi(text, systemPrompt, apiKey, temperature = 1.0, retryCount = 0, modelId = 'google/gemma-3-27b-it:free') {
    // Maximum újrapróbálkozások száma
    const MAX_RETRIES = 3;
    // Várakozási idő milliszekundumban (exponenciálisan növekszik)
    const RETRY_DELAY = 2000 * Math.pow(2, retryCount);
    
    console.log('OpenRouter fordítás:', text.substring(0, 100) + '...', 'API kulcs:', apiKey ? 'Megadva' : 'Hiányzik', 'Model:', modelId);
    
    try {
        // OpenRouter API hívás
        const requestBody = {
            model: modelId,  // Használjuk a paraméterként kapott modell azonosítót
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: temperature
        };
        
        console.log('API kérés:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'SRT Subtitle Translator'
            },
            body: JSON.stringify(requestBody)
        });
        
        // Ha 429-es hiba (túl sok kérés), akkor újrapróbálkozunk
        if (response.status === 429 && retryCount < MAX_RETRIES) {
            console.log(`429 hiba, újrapróbálkozás ${retryCount + 1}/${MAX_RETRIES} (várakozás: ${RETRY_DELAY}ms)...`);
            // Várakozás növekvő idővel
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            // Újrapróbálkozás
            return translateWithOpenRouterApi(text, systemPrompt, apiKey, temperature, retryCount + 1, modelId);
        }
        
        // Válasz szöveg ellenőrzése
        const responseText = await response.text();
        console.log('API válasz szöveg:', responseText);
        
        // Ha a válasz nem JSON formátumú, akkor hibát dobunk
        if (!response.ok) {
            throw new Error(`API hiba: ${response.status} ${response.statusText} - ${responseText}`);
        }
        
        // Válasz JSON-ná alakítása
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Érvénytelen JSON válasz: ${responseText}`);
        }
        
        console.log('API válasz:', data); // Teljes válasz naplózása hibakereséshez
        
        // Ellenőrizzük, hogy a válasz tartalmazza-e a szükséges mezőket
        if (!data) {
            throw new Error('Érvénytelen API válasz: null vagy undefined');
        }
        
        // Ha van hibaüzenet a válaszban, azt is megjelenítjük
        if (data.error) {
            throw new Error(`API hiba: ${data.error.message || JSON.stringify(data.error)}`);
        }
        
        // Próbáljuk meg kinyerni a fordított szöveget a válaszból
        let translatedText = null;
        
        // 1. Ellenőrizzük a choices[0].message.content útvonalat (standard OpenAI formátum)
        if (data.choices && 
            Array.isArray(data.choices) && 
            data.choices.length > 0 && 
            data.choices[0].message && 
            data.choices[0].message.content) {
            translatedText = data.choices[0].message.content.trim();
        }
        // 2. Ellenőrizzük a choices[0].text útvonalat (alternatív formátum)
        else if (data.choices && 
                Array.isArray(data.choices) && 
                data.choices.length > 0 && 
                data.choices[0].text) {
            translatedText = data.choices[0].text.trim();
        }
        // 3. Ellenőrizzük a choices[0].content útvonalat (alternatív formátum)
        else if (data.choices && 
                Array.isArray(data.choices) && 
                data.choices.length > 0 && 
                data.choices[0].content) {
            translatedText = data.choices[0].content.trim();
        }
        // 4. Ellenőrizzük a text útvonalat (egyszerű válasz)
        else if (data.text) {
            translatedText = data.text.trim();
        }
        // 5. Ellenőrizzük a content útvonalat (egyszerű válasz)
        else if (data.content) {
            translatedText = data.content.trim();
        }
        // 6. Ellenőrizzük a message.content útvonalat (egyszerű válasz)
        else if (data.message && data.message.content) {
            translatedText = data.message.content.trim();
        }
        // 7. Ellenőrizzük a completion útvonalat (régebbi API-k)
        else if (data.completion) {
            translatedText = data.completion.trim();
        }
        // 8. Ellenőrizzük a generated_text útvonalat (néhány API)
        else if (data.generated_text) {
            translatedText = data.generated_text.trim();
        }
        // 9. Utolsó lehetőség: a teljes válasz szövegként
        else {
            console.warn('Nem találtunk ismert mezőt a válaszban, a teljes választ használjuk szövegként.');
            translatedText = JSON.stringify(data);
        }
        
        if (!translatedText) {
            throw new Error('Nem sikerült kinyerni a fordított szöveget a válaszból: ' + JSON.stringify(data));
        }
        
        console.log('Fordítás eredménye:', translatedText);
        
        return translatedText;
    } catch (error) {
        console.error('Fordítási hiba:', error);
        
        // Ha hálózati hiba vagy egyéb ideiglenes probléma, újrapróbálkozunk
        if ((error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) && retryCount < MAX_RETRIES) {
            console.log(`Hálózati hiba, újrapróbálkozás ${retryCount + 1}/${MAX_RETRIES} (várakozás: ${RETRY_DELAY}ms)...`);
            // Várakozás növekvő idővel
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            // Újrapróbálkozás
            return translateWithOpenRouterApi(text, systemPrompt, apiKey, temperature, retryCount + 1, modelId);
        }
        
        throw error;
    }
}

// Segédfüggvény a fordítás tisztításához
function cleanTranslation(translatedText, uniqueMarker, endMarker) {
    // Ellenőrizzük, hogy a fordított szöveg nem üres-e
    if (!translatedText) {
        console.warn('A fordított szöveg üres vagy null.');
        return '';
    }
    
    console.log('Tisztítás előtti fordítás:', translatedText);
    
    // Próbáljuk kinyerni a fordítást a markerek közül
    const markerStartIndex = translatedText.indexOf(uniqueMarker);
    const markerEndIndex = translatedText.indexOf(endMarker);
    
    if (markerStartIndex !== -1 && markerEndIndex !== -1 && markerEndIndex > markerStartIndex) {
        // Ha megtaláltuk mindkét markert, akkor kivonjuk a köztük lévő szöveget
        translatedText = translatedText.substring(
            markerStartIndex + uniqueMarker.length,
            markerEndIndex
        ).trim();
    } else {
        // Ha nem találtuk meg a markereket, ellenőrizzük, hogy van-e benne idézőjel
        const quoteMatch = translatedText.match(/"([^"]+)"/);
        if (quoteMatch && quoteMatch[1]) {
            translatedText = quoteMatch[1].trim();
        }
    }
    
    // Eltávolítjuk a markereket, ha még mindig benne vannak
    translatedText = translatedText.replace(uniqueMarker, '').replace(endMarker, '').trim();
    
    // Eltávolítjuk a felesleges sorokat és whitespace-eket
    translatedText = translatedText.replace(/^\s*[\r\n]/gm, '').trim();
    
    // Ellenőrizzük, hogy a modell nem adott-e vissza valami extra szöveget
    // (pl. hibaüzenet, vagy túl rövid a fordítás az eredetihez képest)
    const prefixMatch = translatedText.match(/^(?:A\s+)?(?:fordítás|fordítása|lefordítva|válasz)(?:\s+ez)?[:\s]+(.+)/i);
    if (prefixMatch && prefixMatch[1]) {
        translatedText = prefixMatch[1].trim();
    }
    
    console.log('Tisztítás utáni fordítás:', translatedText);
    
    return translatedText;
}

// Segédfüggvény a nyelv kódjának névvé alakításához
function getLanguageNameLocal(languageCode) {
    const languages = {
        'en': 'angol',
        'hu': 'magyar',
        'de': 'német',
        'fr': 'francia',
        'es': 'spanyol',
        'it': 'olasz',
        'pt': 'portugál',
        'nl': 'holland',
        'pl': 'lengyel',
        'ru': 'orosz',
        'ja': 'japán',
        'zh': 'kínai',
        'ko': 'koreai',
        'ar': 'arab',
        'hi': 'hindi',
        'tr': 'török',
        'sv': 'svéd',
        'da': 'dán',
        'fi': 'finn',
        'no': 'norvég',
        'cs': 'cseh',
        'sk': 'szlovák',
        'ro': 'román',
        'bg': 'bolgár',
        'hr': 'horvát',
        'sr': 'szerb',
        'uk': 'ukrán',
        'el': 'görög',
        'he': 'héber',
        'vi': 'vietnámi',
        'th': 'thai',
        'id': 'indonéz',
        'ms': 'maláj',
        'fa': 'perzsa',
        'ur': 'urdu',
        'bn': 'bengáli'
    };
    
    return languages[languageCode] || languageCode;
}

// Szöveg fordítása kontextussal az LM Studio API-val
async function translateTextWithContext(subtitles, currentIndex, sourceLanguage, targetLanguage, retryCount = 0, temperature, { getLanguageName }) {
    try {
        // Kontextus összeállítása (előző és következő mondatok)
        const currentSubtitle = subtitles[currentIndex].text;
        
        // Kontextus változó inicializálása
        let context = "";
        
        // Előző mondatok hozzáadása a kontextushoz (max 4)
        for (let i = 1; i <= 4; i++) {
            if (currentIndex - i >= 0) {
                context += `Előző mondat ${i}: "${subtitles[currentIndex - i].text}"\n`;
            }
        }
        
        // Következő mondatok hozzáadása a kontextushoz (max 4)
        for (let i = 1; i <= 4; i++) {
            if (currentIndex + i < subtitles.length) {
                context += `Következő mondat ${i}: "${subtitles[currentIndex + i].text}"\n`;
            }
        }
        
        // LM Studio API végpont
        const apiUrl = 'http://localhost:1234/v1/completions';
        
        // Fordítási prompt összeállítása kontextussal
        let prompt = `Te egy professzionális fordító vagy, aki ${getLanguageName(sourceLanguage)} nyelvről ${getLanguageName(targetLanguage)} nyelvre fordít egy filmfeliratot. A fordításnak természetesnek és folyékonynak kell lennie, miközben megőrzi az eredeti jelentést és stílust. Ne használj formázást, kódjelölést vagy idézőjeleket a fordításban.\n\n`;
        
        if (context) {
            prompt += `Kontextus a jobb fordításhoz:\n${context}\n`;
        }
        
        prompt += `Fordítandó mondat: "${currentSubtitle}"\n\nFordítás:`;
        
        // Fordítási kérés összeállítása
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                max_tokens: 500,
                temperature: temperature, // A csúszkával beállított érték használata
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`API hiba: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Ellenőrizzük, hogy van-e válasz
        if (data.choices && data.choices.length > 0 && data.choices[0].text) {
            // Tisztítjuk a fordítást
            let translatedText = data.choices[0].text.trim();
            
            // Ellenőrizzük, hogy a fordítás tartalmaz-e hibás formázást vagy kódjelölést
            if (translatedText.includes('```') || 
                translatedText.startsWith('`') || 
                translatedText.includes('```')) {
                
                // Eltávolítjuk a ``` jelöléseket és a köztük lévő nyelvi azonosítót (ha van)
                translatedText = translatedText.replace(/```[a-z]*\n?/g, '');
                translatedText = translatedText.replace(/```/g, '');
                
                // Eltávolítjuk az egyszeres ` jeleket is
                translatedText = translatedText.replace(/`/g, '');
            }
            
            // Idézőjelek eltávolítása a fordítás elejéről és végéről, ha vannak
            if ((translatedText.startsWith('"') && translatedText.endsWith('"')) || 
                (translatedText.startsWith('"') && translatedText.endsWith('"'))) {
                translatedText = translatedText.substring(1, translatedText.length - 1);
            }
            
            // Ellenőrizzük, hogy a fordítás nem tartalmaz-e hibás vagy értelmetlen szöveget
            // (pl. hibaüzenet, vagy túl rövid a fordítás az eredetihez képest)
            const originalLength = currentSubtitle.length;
            const translatedLength = translatedText.length;
            const isTranslationSuspicious = 
                translatedText.includes("error") || 
                translatedText.includes("hiba") || 
                translatedText.includes("unexpected") ||
                (translatedLength < originalLength * 0.3 && originalLength > 10) || // Túl rövid fordítás
                translatedText.includes("API") ||
                translatedText.includes("endpoint");
            
            // Ha gyanús a fordítás és még nem próbáltuk újra túl sokszor, próbáljuk újra
            if (isTranslationSuspicious && retryCount < 3) {
                console.warn(`Gyanús fordítás, újrapróbálkozás (${retryCount + 1}/3): "${translatedText}"`);
                
                // Várjunk egy kicsit az újrapróbálkozás előtt
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Újrapróbálkozás
                return translateTextWithContext(subtitles, currentIndex, sourceLanguage, targetLanguage, retryCount + 1, temperature, { getLanguageName });
            }
            
            return translatedText;
        } else {
            throw new Error('Nem érkezett fordítási eredmény');
        }
    } catch (error) {
        console.error('Fordítási hiba:', error);
        
        // Újrapróbálkozás hiba esetén, de csak korlátozott számú alkalommal
        if (retryCount < 3) {
            console.warn(`Fordítási hiba, újrapróbálkozás (${retryCount + 1}/3): ${error.message}`);
            
            // Várjunk egy kicsit az újrapróbálkozás előtt
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Újrapróbálkozás
            return translateTextWithContext(subtitles, currentIndex, sourceLanguage, targetLanguage, retryCount + 1, temperature, { getLanguageName });
        }
        
        throw new Error(`Fordítási hiba (${retryCount} próbálkozás után): ${error.message}`);
    }
}

// Szöveg fordítása az LM Studio API-val (régi metódus, megtartva kompatibilitás miatt)
async function translateText(text, sourceLang, targetLang, temperature, { getLanguageName }) {
    return translateTextWithContext(
        [{ text: text }], // Egyetlen felirat
        0, // Az első (és egyetlen) elem indexe
        sourceLang,
        targetLang,
        0, // Nincs újrapróbálkozás
        temperature,
        { getLanguageName }
    );
}

// Globális névtérben elérhetővé tesszük a függvényeket
window.retranslateSubtitle = retranslateSubtitle;
window.translateSequentially = translateSequentially;
window.translateSequentiallyWithOpenRouter = translateSequentiallyWithOpenRouter;
window.translateSequentiallyWithOpenRouterGeminiFlash = translateSequentiallyWithOpenRouterGeminiFlash;
window.translateBatchWithOpenRouterGeminiFlash = translateBatchWithOpenRouterGeminiFlash;
window.translateBatchWithChatGpt = translateBatchWithChatGpt;
window.translateWithOpenRouterApi = translateWithOpenRouterApi;
window.translateTextWithContext = translateTextWithContext;
window.translateText = translateText;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;

// Új, univerzális szekvenciális fordítás az OpenRouter API-val
async function translateSequentiallyWithOpenRouterUniversal(startIndex, sourceLanguage, targetLanguage, apiKey, temperature, modelType, {
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef,
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    showCurrentRowStopButton,
    currentLangCode,
    uiTranslations
}) {
    // API kérések közötti késleltetés (ms) - 0.2 másodperc
    const API_DELAY = 200;
    
    // Modell azonosító kiválasztása
    let modelId;
    let modelDisplayName;
    
    if (modelType === 'openrouter_gemini_flash') {
        modelId = 'google/gemini-2.0-flash-001';
        modelDisplayName = 'Gemini Flash';
    } else if (modelType === 'openrouter_gemma_27b') {
        modelId = 'google/gemma-3-27b-it:free';
        modelDisplayName = 'Gemma 3 27B';
    } else if (modelType === 'openrouter_deepseek_r1') {
        modelId = 'deepseek/deepseek-r1:free';
        modelDisplayName = 'DeepSeek R1';
    } else if (modelType === 'openrouter_gemini_pro') {
        modelId = 'google/gemini-2.0-pro-exp-02-05:free';
        modelDisplayName = 'Gemini Pro 2.0 Exp';
    } else if (modelType === 'openrouter_deepseek_v3') {
        modelId = 'deepseek/deepseek-chat:free';
        modelDisplayName = 'DeepSeek V3';
    } else if (modelType === 'openrouter_llama_70b') {
        modelId = 'meta-llama/llama-3.1-70b-instruct';
        modelDisplayName = 'Llama 3.1 70B';
    } else if (modelType === 'openrouter_gpt4o_mini') {
        modelId = 'openai/gpt-4o-mini';
        modelDisplayName = 'GPT-4o-mini';
    } else {
        // Alapértelmezett esetben Gemma 3 27B
        modelId = 'google/gemma-3-27b-it:free';
        modelDisplayName = 'Gemma 3 27B';
    }
    
    // Az utolsó feldolgozott index nyomon követése
    let lastProcessedIndex = startIndex;
    
    // Végigmegyünk a feliratokon egyesével, szekvenciálisan
    for (let i = startIndex; i < originalSubtitles.length; i++) {
        // Ha a fordítás szüneteltetése be van kapcsolva, akkor kilépünk a ciklusból
        if (isTranslationPausedRef.value) {
            break;
        }
        
        // Aktuális fordítási index frissítése
        lastProcessedIndex = i;
        
        // Ellenőrizzük, hogy már le van-e fordítva ez a felirat
        if (translatedSubtitles[i]) {
            continue; // Átugorjuk a már lefordított feliratokat
        }
        
        // Folyamatjelző frissítése
        updateProgressBar(i, originalSubtitles.length);
        
        // Megjelenítjük az aktuális sor megállítás gombját
        if (showCurrentRowStopButton) {
            showCurrentRowStopButton(i);
        }
        
        try {
            // Kontextus összeállítása (előző és következő mondatok)
            const currentSubtitle = originalSubtitles[i].text;
            
            // Előző 4 mondat összegyűjtése (ha van)
            let previousContext = "";
            for (let j = Math.max(0, i - 4); j < i; j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    previousContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Következő 4 mondat összegyűjtése (ha van)
            let nextContext = "";
            for (let j = i + 1; j < Math.min(originalSubtitles.length, i + 5); j++) {
                if (originalSubtitles[j] && originalSubtitles[j].text) {
                    nextContext += originalSubtitles[j].text + "\n";
                }
            }
            
            // Egyedi azonosító a fordítandó sorhoz
            const uniqueMarker = "###FORDÍTANDÓ_SOR###";
            const endMarker = "###FORDÍTÁS_VÉGE###";
            
            // Teljes kontextus összeállítása
            let contextText = "";
            if (previousContext) {
                contextText += "Előző sorok kontextusként (NEM kell fordítani):\n" + previousContext + "\n";
            }
            contextText += uniqueMarker + "\n" + currentSubtitle + "\n" + endMarker + "\n";
            if (nextContext) {
                contextText += "Következő sorok kontextusként (NEM kell fordítani):\n" + nextContext;
            }
            
            // Fordítási utasítás
            const systemPrompt = `Fordítsd le CSAK a "${uniqueMarker}" és "${endMarker}" közötti szöveget ${getLanguageNameLocal(sourceLanguage)} nyelvről ${getLanguageNameLocal(targetLanguage)} nyelvre. 
A többi szöveg csak kontextus, azt NE fordítsd le. 
A fordításodban KIZÁRÓLAG a lefordított szöveget add vissza, semmilyen jelölést, magyarázatot vagy egyéb szöveget NE adj hozzá.
NE használd a "${uniqueMarker}" vagy "${endMarker}" jelöléseket a válaszodban.`;
            
            // Fordítás végrehajtása az OpenRouter API-val a kiválasztott modellel
            let translatedText;
            try {
                translatedText = await translateWithOpenRouterApi(
                    contextText,
                    systemPrompt,
                    apiKey,
                    temperature,
                    0,
                    modelId
                );
            } catch (error) {
                console.error(`OpenRouter API hiba (${modelDisplayName}):`, error);
                // Részletes hibaüzenet megjelenítése
                alert(`OpenRouter API hiba (${modelDisplayName}): ${error.message}`);
                pauseTranslation();
                break;
            }
            
            // Fordítás tisztítása
            translatedText = cleanTranslation(translatedText, uniqueMarker, endMarker);
            
            // Fordított szöveg mentése
            translatedSubtitles[i] = translatedText;
            
            // Táblázat frissítése
            updateTranslatedText(i, translatedText);
            
            // Újrafordítás gomb megjelenítése
            const retranslateBtn = document.getElementById(`retranslate-${i}`);
            if (retranslateBtn) {
                retranslateBtn.classList.remove('d-none');
            }
            
            // Görgetés az aktuális sorhoz
            scrollToRow(i);
            
            // Fordítási memória frissítése
            if (!translationMemory.translations) {
                translationMemory.translations = {};
            }
            translationMemory.translations[originalSubtitles[i].text] = translatedText;
            
            // Mentés gomb engedélyezése
            saveTranslationBtn.disabled = false;
            
            // Munkafájl mentés gomb megjelenítése
            saveWorkFileBtn.classList.remove('d-none');
            
            // Kis szünet a következő API kérés előtt a sebességkorlát elkerülése érdekében
            await new Promise(resolve => setTimeout(resolve, API_DELAY));
            
        } catch (error) {
            console.error(`Fordítási hiba (${modelDisplayName}):`, error);
            
            // Ha sebességkorlát-túllépés (429) hiba, akkor várunk egy ideig és újra próbáljuk
            if (error.message.includes('429')) {
                console.log('Sebességkorlát-túllépés (429), várakozás 10 másodpercet...');
                alert('We wait 10 seconds for the API speed limit to be exceeded and then continue translating.');
                
                // Várakozás 10 másodpercet
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                // Visszalépünk egy indexet, hogy újra megpróbáljuk ezt a feliratot
                i--;
                continue;
            }
            
            alert(`An error occurred during translation with ${modelDisplayName}: ${error.message}`);
            pauseTranslation();
            break;
        }
    }
    
    // Visszaadjuk az utolsó feldolgozott indexet
    return lastProcessedIndex;
}

// Univerzális kötegelt fordítás az OpenRouter API-val
async function translateBatchWithOpenRouterUniversal(startIndex, sourceLanguage, targetLanguage, apiKey, temperature, modelType, {
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef,
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    showCurrentRowStopButton,
    currentLangCode,
    uiTranslations
}) {
    // Modell azonosító kiválasztása
    let modelId;
    let modelDisplayName;
    
    if (modelType === 'openrouter_gemini_flash') {
        modelId = 'google/gemini-2.0-flash-001';
        modelDisplayName = 'Gemini Flash';
    } else if (modelType === 'openrouter_gemma_27b') {
        modelId = 'google/gemma-3-27b-it:free';
        modelDisplayName = 'Gemma 3 27B';
    } else if (modelType === 'openrouter_deepseek_r1') {
        modelId = 'deepseek/deepseek-r1:free';
        modelDisplayName = 'DeepSeek R1';
    } else if (modelType === 'openrouter_gemini_pro') {
        modelId = 'google/gemini-2.0-pro-exp-02-05:free';
        modelDisplayName = 'Gemini Pro 2.0 Exp';
    } else if (modelType === 'openrouter_deepseek_v3') {
        modelId = 'deepseek/deepseek-chat:free';
        modelDisplayName = 'DeepSeek V3';
    } else if (modelType === 'openrouter_llama_70b') {
        modelId = 'meta-llama/llama-3.1-70b-instruct';
        modelDisplayName = 'Llama 3.1 70B';
    } else if (modelType === 'openrouter_gpt4o_mini') {
        modelId = 'openai/gpt-4o-mini';
        modelDisplayName = 'GPT-4o-mini';
    } else {
        // Alapértelmezett esetben Gemma 3 27B
        modelId = 'google/gemma-3-27b-it:free';
        modelDisplayName = 'Gemma 3 27B';
    }

    // Batch méret (ennyi feliratot fordítunk egyszerre)
    const BATCH_SIZE = 30;
    
    // API kérések közötti késleltetés (ms) - 0.5 másodperc
    const API_DELAY = 500;
    
    // Maximum újrapróbálkozások száma sorszám-egyezési hiba esetén
    const MAX_RETRIES = 3;
    
    // Az utolsó feldolgozott index nyomon követése
    let lastProcessedIndex = startIndex;
    
    // Végigmegyünk a feliratokon, kötegelt módon
    for (let batchStart = startIndex; batchStart < originalSubtitles.length; batchStart += BATCH_SIZE) {
        // Ha a fordítás szüneteltetése be van kapcsolva, akkor kilépünk a ciklusból
        if (isTranslationPausedRef.value) {
            break;
        }
        
        // Aktuális köteg vége (de nem lehet nagyobb, mint a feliratok száma)
        const batchEnd = Math.min(batchStart + BATCH_SIZE, originalSubtitles.length);
        
        // Folyamatjelző frissítése
        updateProgressBar(batchStart, originalSubtitles.length);
        
        // Aktuális sor megállítás gombjának megjelenítése
        if (showCurrentRowStopButton) {
            showCurrentRowStopButton(batchStart);
        }
        
        try {
            // Köteg szövegének összeállítása
            let batchText = "";
            let hasUnprocessedLines = false;
            
            for (let i = batchStart; i < batchEnd; i++) {
                // Csak a még le nem fordított sorokat küldjük el
                if (!translatedSubtitles[i] || translatedSubtitles[i].trim() === '') {
                    // Sorszámozott formában adjuk hozzá a szöveget
                    batchText += `${i+1}. ${originalSubtitles[i].text}\n`;
                    hasUnprocessedLines = true;
                }
            }
            
            // Ha nincs fordítandó szöveg ebben a kötegben, ugrunk a következőre
            if (!hasUnprocessedLines) {
                continue;
            }
            
            // Fordítási utasítás
            const systemPrompt = `Fordítsd le az alábbi számozott mondatokat ${getLanguageNameLocal(sourceLanguage)} nyelvről ${getLanguageNameLocal(targetLanguage)} nyelvre. 
Minden mondatot külön fordíts le, és tartsd meg a sorszámozást a fordításban is.
FONTOS: A válaszodban CSAK a lefordított mondatokat add vissza a sorszámokkal együtt, pontosan ugyanolyan formátumban és sorszámozással, ahogy megkaptad.
Példa a várt formátumra:
1. [fordított szöveg]
2. [fordított másik szöveg]`;
            
            // Homokóra animáció megjelenítése a kiválasztott nyelv szerint
            const currentLang = currentLangCode || 'hu';
            const translations = uiTranslations[currentLang] || {};
            let translationInProgressMessage = translations.batchTranslationInProgress || `{0} {1}-{2} translation in progress...`;
            translationInProgressMessage = translationInProgressMessage
                .replace('{0}', modelDisplayName)
                .replace('{1}', batchStart + 1)
                .replace('{2}', batchEnd);
            
            showLoadingOverlay(translationInProgressMessage);
            
            let retryCount = 0;
            let translationSuccessful = false;
            
            while (retryCount < MAX_RETRIES && !translationSuccessful) {
                try {
                    // Fordítás végrehajtása
                    const translatedBatch = await translateWithOpenRouterApi(
                        batchText,
                        systemPrompt,
                        apiKey,
                        temperature,
                        0,  // retryCount
                        modelId
                    );
                    
                    // Ellenőrizzük, hogy a visszakapott sorszámok megfelelnek-e az elküldötteknek
                    const isNumberingValid = validateLineNumbering(translatedBatch, batchStart);
                    
                    if (isNumberingValid) {
                        // Fordítás feldolgozása
                        processTranslatedBatch(translatedBatch, batchStart, batchEnd, {
                            translatedSubtitles,
                            updateTranslatedText,
                            translationMemory,
                            originalSubtitles,
                            saveTranslationBtn,
                            saveWorkFileBtn
                        });
                        
                        // Sikeres fordítás
                        translationSuccessful = true;
                    } else {
                        // Sorszámozási hiba, újrapróbálkozás
                        console.error(`Sorszámozási hiba a fordításban, újrapróbálkozás (${retryCount + 1}/${MAX_RETRIES})`);
                        
                        // Többnyelvű hibaüzenet
                        const currentLang = currentLangCode || 'hu';
                        const translations = uiTranslations[currentLang] || {};
                        let errorMessage = translations.errorNumberingRetry || `Sorszámozási hiba, újrapróbálkozás ({0}/{1})...`;
                        
                        // Helyőrzők cseréje
                        errorMessage = errorMessage.replace('{0}', retryCount + 1).replace('{1}', MAX_RETRIES);
                        
                        showLoadingOverlay(errorMessage);
                        retryCount++;
                        
                        // Kis szünet az újrapróbálkozás előtt
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error('Kötegelt fordítási hiba:', error);
                    
                    // Ha sebességkorlát-túllépés (429) hiba, akkor várunk egy ideig és újra próbáljuk
                    if (error.message.includes('429')) {
                        console.log('Sebességkorlát-túllépés (429), várakozás 10 másodpercet...');
                        
                        // Többnyelvű hibaüzenet
                        const currentLang = currentLangCode || 'hu';
                        const translations = uiTranslations[currentLang] || {};
                        const errorMessage = translations.errorRateLimitExceeded || 'API sebességkorlát túllépve, várakozás 10 másodpercet...';
                        
                        showLoadingOverlay(errorMessage);
                        
                        // Várakozás 10 másodpercet
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        
                        // Nem számítjuk újrapróbálkozásnak
                        continue;
                    }
                    
                    // Egyéb hiba esetén újrapróbálkozás
                    console.error(`Fordítási hiba, újrapróbálkozás (${retryCount + 1}/${MAX_RETRIES})`);
                    
                    // Többnyelvű hibaüzenet
                    const currentLang = currentLangCode || 'hu';
                    const translations = uiTranslations[currentLang] || {};
                    let errorMessage = translations.errorTranslationRetry || `Fordítási hiba, újrapróbálkozás ({0}/{1})...`;
                    
                    // Helyőrzők cseréje
                    errorMessage = errorMessage.replace('{0}', retryCount + 1).replace('{1}', MAX_RETRIES);
                    
                    showLoadingOverlay(errorMessage);
                    retryCount++;
                    
                    // Kis szünet az újrapróbálkozás előtt
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // Ha minden újrapróbálkozás sikertelen volt
            if (!translationSuccessful) {
                console.error(`Sikertelen fordítás ${MAX_RETRIES} próbálkozás után, továbblépés a következő kötegre.`);
                
                // Többnyelvű hibaüzenet
                const currentLang = currentLangCode || 'hu';
                const translations = uiTranslations[currentLang] || {};
                let errorMessage = translations.errorTranslationFailed || `Sikertelen fordítás {0} próbálkozás után, továbblépés...`;
                
                // Helyőrzők cseréje
                errorMessage = errorMessage.replace('{0}', MAX_RETRIES);
                
                showLoadingOverlay(errorMessage, 2000);
                
                // Kis szünet a következő köteg előtt
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // Utolsó feldolgozott index frissítése
                lastProcessedIndex = batchEnd - 1;
                
                // Görgetés az utolsó feldolgozott sorhoz
                scrollToRow(lastProcessedIndex);
            }
            
            // Homokóra animáció elrejtése
            hideLoadingOverlay();
            
            // Kis szünet a következő API kérés előtt
            if (batchEnd < originalSubtitles.length) {
                await new Promise(resolve => setTimeout(resolve, API_DELAY));
            }
        } catch (error) {
            console.error(`Fordítási hiba (${modelDisplayName} Batch):`, error);
            alert(`Hiba történt a kötegelt fordítás során (${modelDisplayName}): ${error.message}`);
            pauseTranslation();
            break;
        }
    }
    
    // Visszaadjuk az utolsó feldolgozott indexet
    return lastProcessedIndex;
}

// Feliratok fordítása szekvenciálisan (egyesével)
async function translateSubtitleSequentially(startIndex, {
    sourceLanguageSelect,
    targetLanguageSelect,
    temperatureSlider,
    translationModeSelect,
    apiKeyInput,
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef, // Referencia a szüneteltetés változóhoz
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    showCurrentRowStopButton,
    currentLangCode,
    uiTranslations
}) {
    // Nyelvi beállítások
    const sourceLanguage = sourceLanguageSelect.value;
    const targetLanguage = targetLanguageSelect.value;
    
    // Hőmérséklet beállítás
    const temperature = parseFloat(temperatureSlider.value);
    
    // Fordítási mód ellenőrzése
    const selectedMode = translationModeSelect.value;
    const apiKey = apiKeyInput.value;
    
    // Az utolsó feldolgozott index nyomon követése
    let lastProcessedIndex = startIndex;
    
    // A kiválasztott fordítási mód alapján hívjuk meg a megfelelő fordítási függvényt
    if (selectedMode === 'chatgpt_4o_mini' || selectedMode === 'chatgpt_4o') {
        // Ellenőrizzük, hogy van-e API kulcs
        if (!apiKey) {
            alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use ChatGPT!');
            return startIndex;
        }
        
        // ChatGPT modell kiválasztása
        const model = selectedMode === 'chatgpt_4o_mini' ? 'gpt-4o-mini' : 'gpt-4o';
        
        // ChatGPT szekvenciális fordítás végrehajtása
        lastProcessedIndex = await translateSequentiallyWithChatGpt(
            startIndex,
            sourceLanguage,
            targetLanguage,
            apiKey,
            model,
            temperature,
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton
            }
        );
    } else if (selectedMode.startsWith('openrouter_')) {
        // Ellenőrizzük, hogy van-e API kulcs
        if (!apiKey) {
            alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use OpenRouter API!');
            return startIndex;
        }
        
        // OpenRouter szekvenciális fordítás végrehajtása az univerzális függvénnyel
        lastProcessedIndex = await translateSequentiallyWithOpenRouterUniversal(
            startIndex,
            sourceLanguage,
            targetLanguage,
            apiKey,
            temperature,
            selectedMode, // modelType paraméterként átadjuk a kiválasztott modellt
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton,
                currentLangCode,
                uiTranslations
            }
        );
    } else {
        // LM Studio fordítás végrehajtása
        lastProcessedIndex = await translateSequentiallyWithLMStudio(
            startIndex,
            sourceLanguage,
            targetLanguage,
            temperature,
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton
            }
        );
    }
    
    return lastProcessedIndex;
}

// Feliratok fordítása kötegelt módban
async function translateSubtitleBatch(startIndex, {
    sourceLanguageSelect,
    targetLanguageSelect,
    temperatureSlider,
    translationModeSelect,
    apiKeyInput,
    originalSubtitles,
    translatedSubtitles,
    isTranslationPausedRef,
    currentTranslationIndex,
    updateProgressBar,
    updateTranslatedText,
    translationMemory,
    saveTranslationBtn,
    saveWorkFileBtn,
    scrollToRow,
    pauseTranslation,
    showCurrentRowStopButton,
    currentLangCode,
    uiTranslations
}) {
    // Nyelvi beállítások
    const sourceLanguage = sourceLanguageSelect.value;
    const targetLanguage = targetLanguageSelect.value;
    
    // Hőmérséklet beállítás
    const temperature = parseFloat(temperatureSlider.value);
    
    // Fordítási mód ellenőrzése
    const selectedMode = translationModeSelect.value;
    const apiKey = apiKeyInput.value;
    
    // Az utolsó feldolgozott index nyomon követése
    let lastProcessedIndex = startIndex;
    
    // A kiválasztott fordítási mód alapján hívjuk meg a megfelelő fordítási függvényt
    if (selectedMode === 'chatgpt_4o_mini' || selectedMode === 'chatgpt_4o') {
        // Ellenőrizzük, hogy van-e API kulcs
        if (!apiKey) {
            alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use ChatGPT!');
            return startIndex;
        }
        
        // ChatGPT modell kiválasztása
        const model = selectedMode === 'chatgpt_4o_mini' ? 'gpt-4o-mini' : 'gpt-4o';
        
        // ChatGPT kötegelt fordítás végrehajtása
        lastProcessedIndex = await translateBatchWithChatGpt(
            startIndex,
            sourceLanguage,
            targetLanguage,
            apiKey,
            model,
            temperature,
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton
            }
        );
    } else if (selectedMode.startsWith('openrouter_')) {
        // Ellenőrizzük, hogy van-e API kulcs
        if (!apiKey) {
            alert(uiTranslations[currentLangCode]?.errorNoApiKey || 'Please enter the API key to use OpenRouter API!');
            return startIndex;
        }
        
        // OpenRouter kötegelt fordítás végrehajtása az univerzális függvénnyel
        lastProcessedIndex = await translateBatchWithOpenRouterUniversal(
            startIndex,
            sourceLanguage,
            targetLanguage,
            apiKey,
            temperature,
            selectedMode, // modelType paraméterként átadjuk a kiválasztott modellt
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton,
                currentLangCode,
                uiTranslations
            }
        );
    } else {
        // LM Studio-nak nincs kötegelt fordítási módja, helyette szekvenciális fordítást hívunk
        lastProcessedIndex = await translateSequentiallyWithLMStudio(
            startIndex,
            sourceLanguage,
            targetLanguage,
            temperature,
            {
                originalSubtitles,
                translatedSubtitles,
                isTranslationPausedRef,
                currentTranslationIndex,
                updateProgressBar,
                updateTranslatedText,
                translationMemory,
                saveTranslationBtn,
                saveWorkFileBtn,
                scrollToRow,
                pauseTranslation,
                showCurrentRowStopButton
            }
        );
    }
    
    return lastProcessedIndex;
}

// Globális exportálások a többi fájl számára
window.translateSubtitleSequentially = translateSubtitleSequentially;
window.translateSubtitleBatch = translateSubtitleBatch;
window.retranslateSubtitle = retranslateSubtitle;
window.translateWithOpenRouterApi = translateWithOpenRouterApi;
window.translateSequentiallyWithOpenRouterUniversal = translateSequentiallyWithOpenRouterUniversal;
window.translateBatchWithOpenRouterUniversal = translateBatchWithOpenRouterUniversal;
window.translateWithChatGpt = translateWithChatGpt;