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
    document.documentElement.style.marginRight = `${sidebarWidth}px`;
    console.log('in injectsidebar selectedtext:', selectedText, '|| taburl:', currentTabUrl);
    sidebarIframe.onload = () => {
        // Send initial messages to the sidebar
        sidebarIframe.contentWindow.postMessage({
            action: "setInitialContext",
            selectedText: selectedText,
            tabUrl: currentTabUrl,
            docbody: document.body.outerHTML
        }, "*");
        sidebarIframe.contentWindow.postMessage({
            action: "setInputText",
            text: selectedText
        }, "*");

        // --- RESIZE HANDLE LOGIC ---
        const handle = sidebarIframe.contentDocument.getElementById('resize-handle');
        let isResizing = false;
        let startX = 0;
        let initialWidth = 0;

        function startResize(e) {
            isResizing = true;
            startX = e.clientX;
            initialWidth = parseInt(window.getComputedStyle(sidebarIframe).width, 10);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
        }

        function doResize(e) {
            if (!isResizing) return;
            const delta = e.clientX - startX;
            // Since the sidebar is anchored to the right, subtract delta
            const newWidth = initialWidth - delta;
            // Apply min and max constraints
            sidebarWidth = Math.min(Math.max(newWidth, 200), window.innerWidth / 2);
            sidebarIframe.style.width = `${sidebarWidth}px`;
            // Update page content margin right so the website shrinks accordingly
            document.documentElement.style.marginRight = `${sidebarWidth}px`;
        }

        function stopResize() {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }

        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            const iframeRect = sidebarIframe.getBoundingClientRect();
            const clientX = iframeRect.left + e.clientX;
            startResize({ clientX: clientX });
        });

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('mouseleave', stopResize);

        // Ensure events inside the iframe are captured too:
        sidebarIframe.contentDocument.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
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