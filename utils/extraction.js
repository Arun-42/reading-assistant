// In utils/extraction.js

// Function to extract text content from a given URL using md.dhr.wtf service
async function extractPageContent(url) {
    const extractionServiceUrl = `https://md.dhr.wtf/?url=${encodeURIComponent(url)}`;

    try {
        const response = await fetch(extractionServiceUrl);
        if (!response.ok) {
            // Handle non-successful HTTP status codes
            const errorDetails = await response.text();
            throw new Error(`Text extraction failed with status ${response.status}: ${errorDetails}`);
        }
        const extractedText = await response.text();
        return extractedText;

    } catch (error) {
        console.error("Error during text extraction:", error);
        throw error; // Re-throw error for handling in sidebar.js
    }
}

export { extractPageContent }; // Export the function