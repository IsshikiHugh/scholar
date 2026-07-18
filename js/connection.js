let ConnectionsDict = {};


function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addConnectionLink(node) {
    let connectionLinkAdded = false;
    // console.log('Connection', node);
    if (node.nodeType === Node.TEXT_NODE) {
        const names = Object.keys(ConnectionsDict);
        if (names.length === 0) return connectionLinkAdded;
        let content = node.nodeValue;
        // Match all connections. Escape regex metacharacters in names, and sort
        // by length (desc) so a longer name wins over a shorter prefix of it.
        const alternation = names
            .slice()
            .sort((a, b) => b.length - a.length)
            .map(escapeRegExp)
            .join('|');
        const regex = new RegExp(`\\b(${alternation})\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
            const parent = node.parentNode;
            // Split the text node by connections.
            const fragments = content.split(regex);

            fragments.forEach((fragment, index) => {
                if (ConnectionsDict[fragment]) {
                    parent.insertBefore(createCustomNode(fragment, ConnectionsDict[fragment]), node);
                } else {
                    parent.insertBefore(document.createTextNode(fragment), node);
                }
            });
            // Remove the original text node.
            parent.removeChild(node);
            connectionLinkAdded = true;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE && !["A", "SCRIPT", "STYLE"].includes(node.tagName)) {
        const childNodes = Array.from(node.childNodes);
        for (let i = 0; i < childNodes.length; i++) {
            if (addConnectionLink(childNodes[i])) {
                connectionLinkAdded = true;
            }
        }
    }
    return connectionLinkAdded;
}


function createCustomNode(name, link) {
    const a = document.createElement("a")
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.classList.add("connection-link");
    a.textContent = name;
    return a;
}