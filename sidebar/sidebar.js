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



// Event listener for "Test Gemini API" button (NEW)
testApiButton.addEventListener('click', () => {
    geminiResponseArea.textContent = "Testing API, please wait..."; // Initial loading message
    geminiResponseArea.classList.remove('error-response'); // Clear any error class
    geminiResponseArea.classList.add('loading-response'); // Add loading class if you want loading styling

    getApiKey().then(result => {
        const apiKey = result.geminiApiKey;
        if (!apiKey) {
            geminiResponseArea.textContent = "API key not set. Please enter and save your API key.";
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response'); // Add error class for styling
            return; // Stop if API key is not set
        }

        if (!isValidApiKeyFormat(apiKey)) {
            geminiResponseArea.textContent = "Invalid API key format. Please check and save again.";
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response');
            return; // Stop if API key format is invalid
        }


        const userMessage = { role: "user", parts: [{ text: "Hello Gemini, this is a test." }] }; // Simple test message
        const messages = [userMessage]; // Array of messages for the API request

        streamGenerateContent(apiKey, messages)
            .then(response => {
                geminiResponseArea.textContent = ""; // Clear loading message, prepare for streaming

                handleStreamingResponse(response,
                    (data) => { // messageCallback for handling each SSE data event
                        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                            const textPart = data.candidates[0].content.parts[0].text;
                            if (textPart) {
                                geminiResponseArea.textContent += textPart; // Append new text to response area
                            }
                        }
                    },
                    (errorMessage) => { // errorCallback for handling stream or parsing errors
                        geminiResponseArea.textContent = `Error: ${errorMessage}`;
                        geminiResponseArea.classList.remove('loading-response');
                        geminiResponseArea.classList.add('error-response');
                    }
                );
            })
            .catch(apiError => { // Catch errors from streamGenerateContent (e.g., network errors, API errors)
                geminiResponseArea.textContent = `API Error: ${apiError.message}`;
                geminiResponseArea.classList.remove('loading-response');
                geminiResponseArea.classList.add('error-response');
            });


    }).catch(storageError => { // Catch errors from getApiKey (storage access issues)
        geminiResponseArea.textContent = `Error accessing API key storage.`;
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