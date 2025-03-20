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
        console.log("Selected text:", info.selectionText); // Keep this for verification

        // Send a message to the content script to open the sidebar AND pass the selected text
        browser.tabs.sendMessage(tab.id, {
            action: "openSidebar",
            selectedText: info.selectionText // Include selectedText in the message
        });
    }
});