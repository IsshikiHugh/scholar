
function loadContent(file) {
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
    fetch('contents/data.json')
        .then(response => response.json())
        .then(data => {
            // Populate ConnectionsDict from JSON data.
            ConnectionsDict = data.connections;
            // Generate document metadata (title, SEO, social cards) from JSON.
            applyMeta(data);
            // Render and inject the home page.
            document.getElementById('content-main').innerHTML = renderHome(data);
            // Apply connection auto-linking synchronously.
            addConnectionLink(document.getElementById('content-main'));
            // Play teaser videos only while they are on-screen.
            setupLazyVideos(document.getElementById('content-main'));
        })
        .catch(error => console.error('Error loading home:', error));
}

// Pause teaser videos that scroll out of view and (re)play those in view, so
// only visible videos consume decode/network. Videos keep the `autoplay`
// attribute, so browsers without IntersectionObserver still play them natively.
function setupLazyVideos(root) {
    const videos = (root || document).querySelectorAll('video.pub-teaser');
    if (!videos.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                const p = video.play();
                if (p && p.catch) p.catch(() => {}); // ignore autoplay-policy rejections
            } else {
                video.pause();
            }
        });
    }, { rootMargin: '200px 0px', threshold: 0.1 });

    videos.forEach(v => observer.observe(v));
}