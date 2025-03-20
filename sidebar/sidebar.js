import { streamGenerateContent, handleStreamingResponse } from '../utils/gemini-api.js';
import { extractPageContent } from '../utils/extraction.js'; // Import extractPageContent


console.log("Sidebar script loaded!");

let conversationHistory = []; // <--- Initialize conversation history array

// DOM Element Selectors (add new ones for page context)
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const apiKeyStatus = document.getElementById('api-key-status');
const userQuestionInput = document.getElementById('user-question');
const geminiResponseArea = document.getElementById('gemini-response-area');
const pageContextArea = document.getElementById('page-context-area');
const selectedTextArea = document.getElementById('selected-text-area');
const chatHistory = document.getElementById('chat-history');

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

document.addEventListener('DOMContentLoaded', function() {
  // Create a resize handle element
//   const resizeHandle = document.createElement('div');
//   resizeHandle.id = 'resize-handle';
//   resizeHandle.style.cssText = `
//     position: absolute;
//     left: 0;
//     top: 0;
//     width: 6px;
//     height: 100%;
//     cursor: ew-resize;
//     background: transparent;
//     z-index: 1001;
//   `;
  
//   document.body.appendChild(resizeHandle);
  
//   let isResizing = false;
//   let initialWidth, initialMouseX;
  
//   resizeHandle.addEventListener('mousedown', function(e) {
//     isResizing = true;
//     initialWidth = document.body.offsetWidth;
//     initialMouseX = e.clientX;
//     document.body.style.transition = 'none';
    
//     // Add overlay to prevent text selection during resize
//     const overlay = document.createElement('div');
//     overlay.id = 'resize-overlay';
//     overlay.style.cssText = `
//       position: fixed;
//       top: 0;
//       left: 0;
//       right: 0;
//       bottom: 0;
//       z-index: 10000;
//       cursor: ew-resize;
//     `;
//     document.body.appendChild(overlay);
    
//     e.preventDefault();
//   });
  
//   document.addEventListener('mousemove', function(e) {
//     if (!isResizing) return;
    
//     const newWidth = initialWidth - (e.clientX - initialMouseX);
//     if (newWidth >= 250 && newWidth <= 500) {
//       document.body.style.width = newWidth + 'px';
//     }
//   });
  
  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.style.transition = '';
      
      // Remove overlay
      const overlay = document.getElementById('resize-overlay');
      if (overlay) overlay.remove();
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

// // Collapsible section functionality (NEW)
// collapsibleButton.addEventListener('click', function() {
//     this.classList.toggle('active'); // Toggle active class on button (for styling if needed)
//     const content = this.nextElementSibling; // Get the collapsible content element
//     content.classList.toggle('expanded'); // Toggle 'expanded' class on content for animation

//     if (content.classList.contains('expanded')) {
//         content.style.maxHeight = content.scrollHeight + "px"; // Expand: set max height to content's scrollHeight
//     } else {
//         content.style.maxHeight = null; // Collapse: set max height to null (CSS transition will handle animation)
//     }

//     // Load page text only when expanded for the first time (optimization)
//     if (content.classList.contains('expanded') && !pageTextDisplay.dataset.contentLoaded) {
//         pageTextDisplay.dataset.contentLoaded = 'true'; // Mark content as loading/loaded

//         browser.tabs.query({ active: true, currentWindow: true }) // Get current tab URL
//             .then(tabs => {
//                 const currentUrl = tabs[0].url;
//                 pageTextDisplay.textContent = "Extracting page text, please wait..."; // Set loading message

//                 extractPageContent(currentUrl) // Call text extraction function
//                     .then(extractedText => {
//                         pageTextDisplay.textContent = extractedText; // Display extracted text
//                     })
//                     .catch(extractionError => {
//                         pageTextDisplay.textContent = "Error extracting page text."; // Error message
//                         console.error("Text extraction error:", extractionError);
//                     });
//             })
//             .catch(error => {
//                 pageTextDisplay.textContent = "Error getting current page URL."; // Error getting URL
//                 console.error("Error getting current tab:", error);
//             });
//     }
// });


// In sidebar/sidebar.js (inside testApiButton.addEventListener('click', ...))

// userQuestionInput.addEventListener('keydown', ...) - CORRECT and COMPLETE function for Step 13
userQuestionInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) { // Check for Enter key press without Shift
        event.preventDefault(); // Prevent default Enter behavior (newline in textarea)
        const userQuestion = userQuestionInput.value.trim();
        if (!userQuestion) {
            geminiResponseArea.textContent = "Please enter your question.";
            geminiResponseArea.classList.remove('error-response');
            geminiResponseArea.classList.add('error-response');
            return;
        }

        let contextPrompt = userQuestion; // Default prompt is just the user question

        // console.log('user question', contextPrompt);
        // if (conversationHistory.length === 0) {
        //         // Construct CONTEXT PROMPT only for the first turn
        //         const pageContextText = localStorage.getItem('currentPageText') || "Page context not available.";
        //         const currentSelectedText = localStorage.getItem('currentSelectedText') || "";

        //         contextPrompt = `I am reading this:\n<content>\n${pageContextText}\n</content>\n\nIn this,\n> ${currentSelectedText}\n\n${userQuestion}`; // Context Prompt for FIRST turn
        //     } else {
                contextPrompt = userQuestion; // For subsequent turns, just use the user question
        // }
        // console.log('after', contextPrompt);

        // Display the FULL CONTEXT PROMPT as the user message in chat
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'user-message';
        // userMessageDiv.textContent = contextPrompt; // Display full context prompt as user message
        if (contextPrompt.includes('<content>')) {
            // Replace <content>...</content> with <details><content>...</content></details>
            const wrappedContent = contextPrompt.replace(
                /(<content>.*?<\/content>)/gs, 
                '<details>$1</details>'
            );
            userMessageDiv.innerHTML = wrappedContent;
        } else {
            userMessageDiv.innerHTML = contextPrompt;
        }
        chatHistory.appendChild(userMessageDiv); // Append to chatHistory, not geminiResponseArea

        const aiResponseDiv = document.createElement('div');
        aiResponseDiv.className = 'ai-response';
        aiResponseDiv.innerHTML = '<span class="loading-indicator">Loading response...</span>';
        chatHistory.appendChild(aiResponseDiv); // Append to chatHistory, not geminiResponseArea

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


            // Create user message object for conversation history - now using contextPrompt directly
            const userMessage = { role: "user", parts: [{ text: contextPrompt }] }; // Use contextPrompt
            conversationHistory.push(userMessage);

            const messagesForApi = [...conversationHistory];

            streamGenerateContent(apiKey, messagesForApi)
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

        userQuestionInput.value = ""; // Clear input box after sending query (for point 4)
    }
});


// Message listener from content script (for selected text) - No changes from Step 4

// window.addEventListener('message', ...) - CORRECT and COMPLETE function for Step 13 (with input population)
window.addEventListener('message', function(event) {
    if (event.data) {
        if (event.data.action === "setInitialContext") {
            const selectedText = event.data.selectedText;
            const tabUrl = event.data.tabUrl; // Get tabUrl from message
            console.log("Sidebar received initial context. Selected text:", selectedText, "Tab URL:", tabUrl);

            // Store selected text and page text in localStorage for prompt construction later
            localStorage.setItem('currentSelectedText', selectedText || ""); // Store selected text
            localStorage.setItem('currentPageText', ""); // Initialize page text as empty

            document.getElementById("selected-text-area").innerText = selectedText || "(No text selected)"; // Update selected text area
            pageContextArea.innerText = "Extracting...."; // Text to set WHILE it extracts


            // Start text extraction immediately when sidebar opens
            if (tabUrl) {
                extractPageContent(tabUrl)
                    .then(extractedText => {
                        localStorage.setItem('currentPageText', extractedText); // Store extracted page text in localStorage
                        pageContextArea.innerText = extractedText; // Set extracted text in page context area


                        // NEW: Populate input box with full context prompt AFTER extraction (and focus)
                        const contextPromptForInput = `I am reading this:\n<content>\n${extractedText}\n</content>\n\nIn this,\n> ${selectedText}\n\n`;
                        // const contextPromptForInput = ``;
                        userQuestionInput.value = contextPromptForInput; // Populate input

                        userQuestionInput.focus(); // Set focus to input box
                        userQuestionInput.selectionStart = userQuestionInput.selectionEnd = contextPromptForInput.length; // Set cursor to end


                    })
                    .catch(extractionError => {
                        localStorage.setItem('currentPageText', "Error extracting page text."); // Store error message
                        pageContextArea.innerText = "COULD NOT LOAD"; // Set error message in page context area
                        geminiResponseArea.innerHTML = '<div class="ai-response"><span class="error-message">Error extracting page text.</span></div>'; // Show extraction error in chat area - OPTIONAL - you can remove this line if you don't want error in chat history
                        console.error("Text extraction error:", extractionError);
                    });
            }
        }
    }
});
