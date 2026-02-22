
function loadContent(file) {
    console.log('Loading content:', file);
    // Load the content from the file.
    if (file != '#') {
        fetch('html/' + file + '.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('content-main').innerHTML = data;
        })
        .catch(error => console.error('Error loading content:', error));
    }
}

function loadHome() {
    console.log('Loading home from JSON...');
    fetch('contents/data.json')
        .then(response => response.json())
        .then(data => {
            // Populate ConnectionsDict from JSON data.
            ConnectionsDict = data.connections;
            // Render and inject the home page.
            document.getElementById('content-main').innerHTML = renderHome(data);
            // Apply connection auto-linking synchronously.
            addConnectionLink(document.getElementById('content-main'));
        })
        .catch(error => console.error('Error loading home:', error));
}