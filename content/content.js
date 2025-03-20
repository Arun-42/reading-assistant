console.log("Content script loaded!");

let sidebarIframe = null; // To keep track of the sidebar iframe

// Function to create and inject the sidebar
function injectSidebar(selectedText, currentTabUrl) { // Modified to accept selectedText
    if (sidebarIframe) { // If sidebar already exists, just return
        return;
    }

    sidebarIframe = document.createElement('iframe');

    sidebarIframe.src = browser.runtime.getURL("sidebar/sidebar.html"); // Path to your sidebar HTML

    let sidebarWidth = 450;
    sidebarIframe.style.width = `${sidebarWidth}px`; // Set initial width using pixels - important for resize to work correctly
    sidebarIframe.style.height = '100vh';
    sidebarIframe.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            /*width: 300px;  Match CSS width */
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

        // --- RESIZE HANDLE LOGIC (inside iframe.onload for sidebar context) ---
const handle = sidebarIframe.contentDocument.getElementById('resize-handle');
let isResizing = false;
let startX = 0;
let initialWidth = 0;

// Function to start resizing
function startResize(e) {
    isResizing = true;
    startX = e.clientX;
    
    // Get the current width of the sidebar from its computed style
    initialWidth = parseInt(window.getComputedStyle(sidebarIframe).width, 10);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
}

// Function to do the resizing
function doResize(e) {
    if (!isResizing) return;
    
    const delta = e.clientX - startX;
    const newWidth = initialWidth - delta;
    
    // Apply min/max constraints
    sidebarWidth = Math.min(
        Math.max(newWidth, 200),
        window.innerWidth / 2
    );
    
    sidebarIframe.style.width = `${sidebarWidth}px`;
}

// Function to stop resizing
function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
}

// Add event to iframe handle
handle.addEventListener('mousedown', function(e) {
    e.preventDefault(); // Prevent text selection
    
    // Get the correct clientX by accounting for iframe's position
    const iframeRect = sidebarIframe.getBoundingClientRect();
    const clientX = iframeRect.left + e.clientX;
    
    // Create a new event-like object with the correct clientX
    const newEvent = {
        clientX: clientX
    };
    
    startResize(newEvent);
});

// Add main document events
document.addEventListener('mousemove', doResize);
document.addEventListener('mouseup', stopResize);
document.addEventListener('mouseleave', stopResize);

// Ensure we're capturing events from the iframe too
sidebarIframe.contentDocument.addEventListener('mousemove', function(e) {
    // Only process if we're already resizing (started from handle)
    if (!isResizing) return;
    
    // Convert iframe coordinates to main document coordinates
    const iframeRect = sidebarIframe.getBoundingClientRect();
    const clientX = iframeRect.left + e.clientX;
    
    doResize({ clientX: clientX });
});

sidebarIframe.contentDocument.addEventListener('mouseup', stopResize);
        // --- END RESIZE HANDLE LOGIC ---
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