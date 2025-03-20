// In utils/gemini-api.js

// Function to streamGenerateContent using Gemini API
async function streamGenerateContent(apiKey, messages) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: messages
            })
        });

        if (!response.ok) {
            // Non-successful HTTP status code
            const errorDetails = await response.text(); // Get error details from response body if possible
            throw new Error(`Gemini API request failed with status ${response.status}: ${errorDetails}`);
        }
        return response; // Return the response object for SSE handling in sidebar.js

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error; // Re-throw the error to be caught in sidebar.js
    }
}


// Function to handle streaming response and process SSE events
function handleStreamingResponse(response, messageCallback, errorCallback) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function processStream() {
        return reader.read().then(({ done, value }) => {
            if (done) {
                reader.releaseLock(); // Release the lock when stream is finished
                return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the last (potentially incomplete) line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(5).trim(); // Remove 'data: ' and trim whitespace
                    if (data === '[DONE]') {
                        reader.releaseLock(); // Release lock on [DONE]
                        return;
                    }
                    try {
                        const parsedData = JSON.parse(data);
                        messageCallback(parsedData); // Call callback with parsed data
                    } catch (e) {
                        console.error("Error parsing SSE data:", e, "Line:", line);
                        errorCallback("Error parsing server response."); // Notify error to callback
                        reader.releaseLock(); // Release lock in case of parse error
                        return;
                    }
                } else if (line.trim() !== "") { // Handle unexpected non-empty lines (optional error handling)
                    console.warn("Unexpected line in SSE stream:", line);
                }
            }
            return processStream(); // Continue processing the stream
        }).catch(error => {
            console.error("Stream reading error:", error);
            errorCallback("Error reading server response."); // Notify error to callback
            reader.releaseLock(); // Release lock in case of stream read error
        });
    }

    return processStream(); // Start processing the stream
}


export { streamGenerateContent, handleStreamingResponse }; // Export functions