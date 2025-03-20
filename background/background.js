console.log("Background script loaded!");

// Create context menu item
browser.contextMenus.create({
    id: "ask-about-selection",
    title: "Ask about this text",
    contexts: ["selection"]
});

// Listen for clicks on the context menu item
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ask-about-selection") {
        console.log("Selected text:", info.selectionText);

        // Get current tab URL in background script
        browser.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
                const currentUrl = tabs[0].url;

                const selectedTextToSend = info.selectionText ?? ""; // Use ?? to default to ""

                // Send message to content script to open sidebar AND include selected text AND current URL
                browser.tabs.sendMessage(tab.id, {
                    action: "openSidebar",
                    selectedText: selectedTextToSend,
                    currentTabUrl: currentUrl // Send currentTabUrl to content script
                });
            })
            .catch(error => {
                console.error("Error getting current tab URL:", error);
                // Optionally, send an error message to content script/sidebar if needed
            });
    }
});