import { streamGenerateContent, handleStreamingResponse } from '../utils/gemini-api.js'; // Import API functions

console.log("Sidebar script loaded!");

// DOM Element Selectors (same as before, plus new ones)
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const apiKeyStatus = document.getElementById('api-key-status');
const selectedTextDisplay = document.getElementById('selected-text-display');
const testApiButton = document.getElementById('test-api-button'); // New test API button
const geminiResponseArea = document.getElementById('gemini-response-area'); // New response area

// Function to save API key to storage
function saveApiKey(key) {
    return browser.storage.local.set({ geminiApiKey: key }); // Store as 'geminiApiKey'
}

// Function to get API key from storage
function getApiKey() {
    return browser.storage.local.get('geminiApiKey'); // Retrieve 'geminiApiKey'
}

// Basic client-side validation for API key format (example: starts with AIza, at least 30 chars)
function isValidApiKeyFormat(key) {
    return typeof key === 'string' && key.startsWith('AIza') && key.length >= 30;
}

// Load API key from storage when sidebar loads and pre-fill input
document.addEventListener('DOMContentLoaded', () => {
    getApiKey().then(result => {
        const storedKey = result.geminiApiKey;
        if (storedKey) {
            apiKeyInput.value = storedKey; // Pre-fill input field
            apiKeyStatus.textContent = "API key loaded."; // Update status message
            apiKeyStatus.className = ""; // Remove error class if present
        } else {
            apiKeyStatus.textContent = "API key not set."; // Indicate key not set yet
            apiKeyStatus.className = "error"; // Add error class for styling (e.g., red color)
        }
    });
});


// Event listener for the "Save Key" button
saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim(); // Get trimmed value from input

    if (isValidApiKeyFormat(apiKey)) { // Validate format
        saveApiKey(apiKey)
            .then(() => {
                apiKeyStatus.textContent = "API key saved successfully!"; // Success message
                apiKeyStatus.className = ""; // Remove error class
            })
            .catch(error => {
                console.error("Error saving API key:", error);
                apiKeyStatus.textContent = "Error saving API key."; // Generic error message
                apiKeyStatus.className = "error"; // Add error class
            });
    } else {
        apiKeyStatus.textContent = "Invalid API key format. Please check."; // Format error message
        apiKeyStatus.className = "error"; // Add error class
    }
});



// In sidebar/sidebar.js (inside testApiButton.addEventListener('click', ...))

testApiButton.addEventListener('click', () => {
    geminiResponseArea.textContent = ""; // Clear previous content
    geminiResponseArea.innerHTML = '<span class="loading-indicator">Loading response...</span>'; // Set loading indicator using innerHTML for span
    geminiResponseArea.classList.remove('error-response');
    geminiResponseArea.classList.add('loading-response');


    getApiKey().then(result => {
        const apiKey = result.geminiApiKey;
        if (!apiKey) {
            geminiResponseArea.innerHTML = '<span class="error-message">API key not set. Please enter and save your API key.</span>'; // Use innerHTML for error span
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response');
            return;
        }
        if (!isValidApiKeyFormat(apiKey)) {
            geminiResponseArea.innerHTML = '<span class="error-message">Invalid API key format. Please check and save again.</span>'; // Use innerHTML for error span
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response');
            return;
        }


        const userMessage = { role: "user", parts: [{ text: "Hello Gemini, write a 200 word story in changes in human body at age 0.2" }] };
        const messages = [userMessage];

        streamGenerateContent(apiKey, messages)
            .then(response => {
                geminiResponseArea.innerHTML = ""; // Clear loading indicator, prepare for streaming

                handleStreamingResponse(response,
                    (data) => { // messageCallback
                        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                            const textPart = data.candidates[0].content.parts[0].text;
                            if (textPart) {
                                geminiResponseArea.textContent += textPart; // Append span to response area
                                geminiResponseArea.scrollTop = geminiResponseArea.scrollHeight; // Auto-scroll to bottom
                            }
                        }
                    },
                    (errorMessage) => { // errorCallback
                        geminiResponseArea.innerHTML = `<span class="error-message">Error: ${errorMessage}</span>`; // Use innerHTML for error span
                        geminiResponseArea.classList.remove('loading-response');
                        geminiResponseArea.classList.add('error-response');
                    }
                );
            })
            .catch(apiError => { // catch API errors
                geminiResponseArea.innerHTML = `<span class="error-message">API Error: ${apiError.message}</span>`; // Use innerHTML for error span
                geminiResponseArea.classList.remove('loading-response');
                geminiResponseArea.classList.add('error-response');
            });


    }).catch(storageError => { // catch storage errors
        geminiResponseArea.innerHTML = '<span class="error-message">Error accessing API key storage.</span>'; // Use innerHTML for error span
        geminiResponseArea.classList.remove('loading-response');
        geminiResponseArea.classList.add('error-response');
        console.error("Error getting API key from storage:", storageError);
    });
});


// Message listener from content script (for selected text) - No changes from Step 4
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === "setSelectedText") {
        const selectedText = event.data.text;
        console.log("Sidebar received selected text:", selectedText);

        if (selectedTextDisplay) {
            const formattedText = selectedText.split('\n').map(line => `> ${line}`).join('\n');
            selectedTextDisplay.textContent = formattedText;
        }
    }
});