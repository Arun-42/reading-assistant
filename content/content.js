console.log("Content script loaded!");

let sidebarIframe = null; // To keep track of the sidebar iframe

// Function to create and inject the sidebar
function injectSidebar(selectedText, currentTabUrl) { // Modified to accept selectedText
    if (sidebarIframe) { // If sidebar already exists, just return
        return;
    }

    sidebarIframe = document.createElement('iframe');
    sidebarIframe.src = browser.runtime.getURL("sidebar/sidebar.html"); // Path to your sidebar HTML
    sidebarIframe.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 300px; /* Match CSS width */
            height: 100vh;
            border: none;
            z-index: 1001; /* Higher than sidebar's z-index to be on top if needed */
            box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2); /* Slightly stronger shadow */
        `;
    document.body.appendChild(sidebarIframe);
    console.log('in injectsidebar selectedtext:', selectedText, '|| taburl:', currentTabUrl);
    sidebarIframe.onload = () => { // Wait for iframe to load before sending message
        // Send the selected text to the sidebar iframe after it's loaded
        sidebarIframe.contentWindow.postMessage({
            action: "setInitialContext", // Action for the sidebar to handle
            selectedText: selectedText,          // The selected text itself
            tabUrl: currentTabUrl 
        }, "*"); // '*' is for origin, for simplicity in extensions, but be mindful in web apps

        sidebarIframe.contentWindow.postMessage({  // <-- NEW MESSAGE
            action: "setInputText",              // <-- NEW ACTION
            text: selectedText                  // <-- Send selectedText again, specifically for input
        }, "*");
    };
}

// Function to remove the sidebar (for later, if needed) - No changes needed

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openSidebar") {
        console.log('in contentjs: selectedtext:', message.selectedText, '|| taburl:', message.currentTabUrl)
        injectSidebar(message.selectedText, message.currentTabUrl); // Pass selectedText to injectSidebar
    } else if (message.action === "closeSidebar") { // For future use - No changes needed
        // removeSidebar();
    }
});