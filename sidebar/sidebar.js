import { streamGenerateContent, handleStreamingResponse } from '../utils/gemini-api.js';
import { extractPageContent } from '../utils/extraction.js'; // Import extractPageContent


console.log("Sidebar script loaded!");

let conversationHistory = []; // <--- Initialize conversation history array

// DOM Element Selectors (add new ones for page context)
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const apiKeyStatus = document.getElementById('api-key-status');
const selectedTextDisplay = document.getElementById('selected-text-display');
const testApiButton = document.getElementById('test-api-button');
const geminiResponseArea = document.getElementById('gemini-response-area');
const pageTextDisplay = document.getElementById('page-text-display'); // Page text display area
const pageContextSection = document.getElementById('page-context-section'); // Collapsible section
const collapsibleButton = document.querySelector('.collapsible-button'); // Collapsible button
const askGeminiButton = document.getElementById('ask-gemini-button'); // Renamed button ID
const userQuestionInput = document.getElementById('user-question'); // New question input

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

// Collapsible section functionality (NEW)
collapsibleButton.addEventListener('click', function() {
    this.classList.toggle('active'); // Toggle active class on button (for styling if needed)
    const content = this.nextElementSibling; // Get the collapsible content element
    content.classList.toggle('expanded'); // Toggle 'expanded' class on content for animation

    if (content.classList.contains('expanded')) {
        content.style.maxHeight = content.scrollHeight + "px"; // Expand: set max height to content's scrollHeight
    } else {
        content.style.maxHeight = null; // Collapse: set max height to null (CSS transition will handle animation)
    }

    // Load page text only when expanded for the first time (optimization)
    if (content.classList.contains('expanded') && !pageTextDisplay.dataset.contentLoaded) {
        pageTextDisplay.dataset.contentLoaded = 'true'; // Mark content as loading/loaded

        browser.tabs.query({ active: true, currentWindow: true }) // Get current tab URL
            .then(tabs => {
                const currentUrl = tabs[0].url;
                pageTextDisplay.textContent = "Extracting page text, please wait..."; // Set loading message

                extractPageContent(currentUrl) // Call text extraction function
                    .then(extractedText => {
                        pageTextDisplay.textContent = extractedText; // Display extracted text
                    })
                    .catch(extractionError => {
                        pageTextDisplay.textContent = "Error extracting page text."; // Error message
                        console.error("Text extraction error:", extractionError);
                    });
            })
            .catch(error => {
                pageTextDisplay.textContent = "Error getting current page URL."; // Error getting URL
                console.error("Error getting current tab:", error);
            });
    }
});


// In sidebar/sidebar.js (inside testApiButton.addEventListener('click', ...))

askGeminiButton.addEventListener('click', () => {
    const userQuestion = userQuestionInput.value.trim();
    if (!userQuestion) {
        geminiResponseArea.textContent = "Please enter your question.";
        geminiResponseArea.classList.remove('loading-response');
        geminiResponseArea.classList.add('error-response');
        return;
    }

    // Display user message in chat history
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'user-message';
    userMessageDiv.textContent = userQuestion;
    geminiResponseArea.appendChild(userMessageDiv); // Append user message

    const aiResponseDiv = document.createElement('div'); // Container for AI response
    aiResponseDiv.className = 'ai-response';
    aiResponseDiv.innerHTML = '<span class="loading-indicator">Loading response...</span>'; // Loading indicator inside AI response
    geminiResponseArea.appendChild(aiResponseDiv); // Append AI response container

    geminiResponseArea.classList.remove('error-response');
    geminiResponseArea.classList.add('loading-response');


    getApiKey().then(result => {
        const apiKey = result.geminiApiKey;
        if (!apiKey) {
            aiResponseDiv.innerHTML = '<span class="error-message">API key not set. Please enter and save your API key.</span>';
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response');
            return;
        }
        if (!isValidApiKeyFormat(apiKey)) {
            aiResponseDiv.innerHTML = '<span class="error-message">Invalid API key format. Please check and save again.</span>';
            geminiResponseArea.classList.remove('loading-response');
            geminiResponseArea.classList.add('error-response');
            return;
        }


        const pageContextText = pageTextDisplay.textContent;
        const selectedText = selectedTextDisplay.textContent;
        const contextPrompt = `Page Context:\n${pageContextText}\n\nSelected Text:\n${selectedText}\n\nUser Question: ${userQuestion}`;


        // Create user message object for conversation history
        const userContent = { role: "user", parts: [{ text: contextPrompt }] }; // Use contextPrompt
        conversationHistory.push(userContent); // Add user message to history

        const messagesForApi = [...conversationHistory]; // Create a copy of history for API request

        streamGenerateContent(apiKey, messagesForApi) // Send conversation history in API request
            .then(response => {
                aiResponseDiv.innerHTML = ""; // Clear loading indicator in AI response container

                let aiResponseContent = { role: "model", parts: [] }; // Initialize AI response content
                conversationHistory.push(aiResponseContent); // Add empty AI response to history

                handleStreamingResponse(response,
                    (data) => { // messageCallback - modified to append to conversation history
                        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                            const textPart = data.candidates[0].content.parts[0].text;
                            if (textPart) {
                                aiResponseDiv.textContent += textPart; // Append to AI response container
                                conversationHistory[conversationHistory.length - 1].parts.push({ text: textPart }); // Append chunk to history
                                geminiResponseArea.scrollTop = geminiResponseArea.scrollHeight;
                            }
                        }
                    },
                    (errorMessage) => { // errorCallback - no change
                        aiResponseDiv.innerHTML = `<span class="error-message">Error: ${errorMessage}</span>`;
                        geminiResponseArea.classList.remove('loading-response');
                        geminiResponseArea.classList.add('error-response');
                    }
                );
            })
            .catch(apiError => { // catch API errors - no change
                aiResponseDiv.innerHTML = `<span class="error-message">API Error: ${apiError.message}</span>`;
                geminiResponseArea.classList.remove('loading-response');
                geminiResponseArea.classList.add('error-response');
            });


    }).catch(storageError => { // catch storage errors - no change
        aiResponseDiv.innerHTML = `<span class="error-message">Error accessing API key storage.</span>`;
        geminiResponseArea.classList.remove('loading-response');
        geminiResponseArea.classList.add('error-response');
        console.error("Error getting API key from storage:", storageError);
    });
});


// Message listener from content script (for selected text) - No changes from Step 4
window.addEventListener('message', function(event) {
    if (event.data) {
        if (event.data.action === "setInitialContext") {
            const selectedText = event.data.selectedText;
            const tabUrl = event.data.tabUrl; // Get tabUrl from message
            console.log("Sidebar received initial context. Selected text:", selectedText, "Tab URL:", tabUrl);

            if (selectedTextDisplay) {
                const formattedText = selectedText.split('\n').map(line => `> ${line}`).join('\n');
                selectedTextDisplay.textContent = formattedText;
            }

            // Trigger text extraction here, using the received tabUrl
            if (tabUrl) {
                // Find the page-text-display element (assuming it exists in your sidebar.html)
                if (pageTextDisplay && pageContextSection.classList.contains('collapsible')) {
                    pageTextDisplay.dataset.contentLoaded = 'true'; // Mark as loading/loaded (even though loading starts now)
                    pageTextDisplay.textContent = "Extracting page text, please wait..."; // Set loading message

                    extractPageContent(tabUrl) // Use received tabUrl for extraction
                        .then(extractedText => {
                            pageTextDisplay.textContent = extractedText; // Display extracted text
                        })
                        .catch(extractionError => {
                            pageTextDisplay.textContent = "Error extracting page text."; // Error message
                            console.error("Text extraction error:", extractionError);
                        });
                }
            }

        } 
       }
});
