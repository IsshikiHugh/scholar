
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

// In-page anchors (#news, #pub, #exp) glide to their section instead of
// jumping: a fixed average speed, starting fast and easing out at the end.
//
// The page is scrolled to the target at once and the body is slid from where
// it was into place with a transform animation. The browser runs transform
// animations on its compositor thread at the display's full refresh rate,
// whereas stepping scrollTo() from requestAnimationFrame stutters whenever the
// main thread is busy (and Safari caps it at 60 fps). Any wheel/touch/key
// input from the user stops the glide where it is.
(function setupSmoothAnchors() {
    const reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !document.body.animate) return;

    const SCROLL_SPEED = 1.3; // px per ms, averaged over the whole glide
    const EASE_OUT = 'cubic-bezier(0.25, 1, 0.5, 1)'; // ease-out quart: long, gentle settle

    let glide = null; // { anim, targetY } while a glide is running

    // Turn whatever is on screen mid-glide into a real scroll position.
    function stop() {
        if (!glide) return;
        const { anim, targetY } = glide;
        glide = null;
        const offset = new DOMMatrixReadOnly(getComputedStyle(document.body).transform).m42;
        anim.cancel();
        window.scrollTo(0, targetY - offset);
    }
    ['wheel', 'touchstart', 'keydown'].forEach(type =>
        window.addEventListener(type, stop, { passive: true }));

    function glideTo(targetY) {
        stop();
        const startY = window.scrollY;
        window.scrollTo(0, targetY);
        const endY = window.scrollY;
        const distance = endY - startY;
        if (Math.abs(distance) < 1) return;

        const anim = document.body.animate(
            [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }],
            { duration: Math.abs(distance) / SCROLL_SPEED, easing: EASE_OUT });
        glide = { anim, targetY: endY };
        anim.onfinish = () => { if (glide && glide.anim === anim) glide = null; };
    }

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0
            || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest && event.target.closest('a[href^="#"]');
        if (!link) return;
        const hash = link.getAttribute('href');
        if (hash.length < 2) return; // bare "#" is the Home/Theme loader
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) return;

        event.preventDefault();
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        const targetY = Math.min(maxY, target.getBoundingClientRect().top + window.scrollY);
        glideTo(Math.max(0, targetY));
        if (location.hash !== hash) history.pushState(null, '', hash);
    });
})();
