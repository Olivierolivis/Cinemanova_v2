/**
 * Cinemanova - Premium Cinematic Movie Website
 * Uses TMDB API for data, YouTube for trailers, localStorage for favorites & theme
 */

const TMDB_API_KEY = 'c1fc2189591a15fbec101a32dcd46b9d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/';
const IMG_SIZE = { backdrop: 'original', poster: 'w500', cast: 'w185' };

let currentPage = { popular: 1, topRated: 1 };
let currentGenre = null;
let favorites = JSON.parse(localStorage.getItem('cinemanovaFavorites')) || [];
let currentMovie = null;
let isLoading = false;

const els = {
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mobileMenu: document.getElementById('mobile-menu'),
    navbar: document.getElementById('navbar'),
    backToTop: document.getElementById('back-to-top'),
    heroBackdrop: document.getElementById('hero-backdrop'),
    heroTitle: document.getElementById('hero-title'),
    heroRelease: document.getElementById('hero-release-date'),
    heroRating: document.getElementById('hero-rating').querySelector('span'),
    heroRuntime: document.getElementById('hero-runtime').querySelector('span'),
    heroGenres: document.getElementById('hero-genres').querySelector('span'),
    heroOverview: document.getElementById('hero-overview'),
    heroWatchBtn: document.getElementById('hero-watch-btn'),
    heroFavBtn: document.getElementById('hero-fav-btn'),
    trendingContainer: document.getElementById('trending-container'),
    trendingSkeleton: document.getElementById('trending-skeleton'),
    popularContainer: document.getElementById('popular-container'),
    popularSkeleton: document.getElementById('popular-skeleton'),
    topRatedContainer: document.getElementById('toprated-container'),
    topRatedSkeleton: document.getElementById('toprated-skeleton'),
    favoritesContainer: document.getElementById('favorites-container'),
    noFavorites: document.getElementById('no-favorites'),
    genreFilters: document.getElementById('genre-filters'),
    cursor: document.getElementById('cursor'),
    particleCanvas: document.getElementById('particle-bg')
};

// 🛠️ UTILITIES
const formatRuntime = (m) => m ? `${Math.floor(m / 60)}h ${m % 60}m` : 'N/A';
const formatYear = (d) => d ? d.substring(0, 4) : 'N/A';
const isFavorite = (id) => favorites.some(f => f.id === id);

const toggleFavoriteState = (movie, btnEl) => {
    const idx = favorites.findIndex(f => f.id === movie.id);
    if (idx > -1) {
        favorites.splice(idx, 1);
        if(btnEl) btnEl.innerHTML = '<i class="fa-regular fa-heart"></i> <span>Add to Favorites</span>';
    } else {
        favorites.push(movie);
        if(btnEl) btnEl.innerHTML = '<i class="fa-solid fa-heart text-neon"></i> <span>Remove from Favorites</span>';
    }
    localStorage.setItem('cinemanovaFavorites', JSON.stringify(favorites));
    renderFavorites();
    updateHeroFavBtn();
};

// 🎬 API
const fetchData = async (endpoint, params = {}) => {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB API Error: ${res.status}`);
    return await res.json();
};

// 🖼️ RENDER
const createMovieCard = (movie, delay = 0) => {
    const rating = Math.round(movie.vote_average * 10);
    const isFav = isFavorite(movie.id);
    return `
        <div class="fade-in-up glass-card rounded-xl overflow-hidden cursor-pointer group relative" 
             style="animation-delay: ${delay}ms" data-id="${movie.id}">
            <div class="relative overflow-hidden aspect-[2/3]">
                <img src="${TMDB_IMG_BASE}${IMG_SIZE.poster}${movie.poster_path}" 
                     alt="${movie.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div class="w-full flex justify-between items-center">
                        <button class="bg-neon text-black px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">
                            <i class="fa-solid fa-play mr-1"></i> Watch
                        </button>
                        <button class="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-neon hover:text-black transition-colors fav-btn" data-id="${movie.id}">
                            <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart ${isFav ? 'text-neon' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="absolute top-3 left-3 rating-circle" style="--rating: ${rating}">
                    <span>${movie.vote_average.toFixed(1)}</span>
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-white text-lg line-clamp-1 mb-1">${movie.title}</h3>
                <div class="flex items-center justify-between text-sm text-gray-400">
                    <span>${formatYear(movie.release_date)}</span>
                    <span class="flex items-center gap-1"><i class="fa-solid fa-star text-neon text-xs"></i> ${movie.vote_average.toFixed(1)}</span>
                </div>
            </div>
        </div>
    `;
};

const renderTrending = async (timeWindow = 'day') => {
    els.trendingSkeleton.classList.remove('hidden');
    els.trendingContainer.innerHTML = '';
    try {
        const data = await fetchData(`/trending/movie/${timeWindow}`);
        els.trendingSkeleton.classList.add('hidden');
        els.trendingContainer.innerHTML = data.results.map((m, i) => createMovieCard(m, i * 100)).join('');
        initSwiper('.trending-swiper', '.trending-pagination');
        attachCardListeners(els.trendingContainer);
    } catch (e) { console.error(e); }
};

const renderPopular = async (page = 1) => {
    if (isLoading) return; isLoading = true;
    els.popularSkeleton.classList.remove('hidden');
    try {
        const data = await fetchData('/movie/popular', { page, ...(currentGenre && { with_genres: currentGenre }) });
        els.popularSkeleton.classList.add('hidden');
        els.popularContainer.innerHTML = data.results.map((m, i) => createMovieCard(m, i * 100)).join('');
        currentPage.popular = data.page;
        renderPagination('popular-pagination', data.total_pages, 'popular');
        attachCardListeners(els.popularContainer);
    } catch (e) { console.error(e); } finally { isLoading = false; }
};

const renderTopRated = async (page = 1) => {
    els.topRatedSkeleton.classList.remove('hidden');
    try {
        const data = await fetchData('/movie/top_rated', { page, ...(currentGenre && { with_genres: currentGenre }) });
        els.topRatedSkeleton.classList.add('hidden');
        els.topRatedContainer.innerHTML = data.results.map((m, i) => createMovieCard(m, i * 100)).join('');
        currentPage.topRated = data.page;
        renderPagination('toprated-pagination', data.total_pages, 'topRated');
        attachCardListeners(els.topRatedContainer);
    } catch (e) { console.error(e); }
};

const renderFavorites = () => {
    if (favorites.length === 0) {
        els.favoritesContainer.innerHTML = '';
        els.noFavorites.classList.remove('hidden');
        return;
    }
    els.noFavorites.classList.add('hidden');
    els.favoritesContainer.innerHTML = favorites.map((m, i) => createMovieCard(m, i * 100)).join('');
    attachCardListeners(els.favoritesContainer);
};

const renderPagination = (containerId, totalPages, type) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    const start = Math.max(1, currentPage[type] - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
        html += `<button class="px-4 py-2 rounded-lg ${currentPage[type] === i ? 'bg-neon text-black' : 'bg-white/10 hover:bg-white/20'} transition-colors" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (type === 'popular') renderPopular(page);
            else renderTopRated(page);
        });
    });
};

const renderGenreFilters = async () => {
    try {
        const data = await fetchData('/genre/movie/list');
        els.genreFilters.innerHTML = `<button class="genre-btn active px-4 py-2 rounded-full bg-neon/20 border border-neon/40 text-sm hover:bg-neon hover:text-black transition-all" data-genre="">All</button>`;
        data.genres.forEach(g => {
            els.genreFilters.innerHTML += `<button class="genre-btn px-4 py-2 rounded-full bg-white/5 border border-white/20 text-sm hover:bg-neon hover:text-black transition-all" data-genre="${g.id}">${g.name}</button>`;
        });
        
        els.genreFilters.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.genre-btn').forEach(b => b.classList.replace('bg-neon', 'bg-white/5'), b.classList.replace('text-black', 'text-white'));
                btn.classList.replace('bg-white/5', 'bg-neon');
                btn.classList.replace('text-white', 'text-black');
                currentGenre = btn.dataset.genre;
                renderPopular(1);
                renderTopRated(1);
            });
        });
    } catch (e) { console.error(e); }
};

// 🎥 HERO
const loadHero = async () => {
    try {
        const trending = await fetchData('/trending/movie/day');
        const hero = trending.results[0];
        els.heroBackdrop.style.backgroundImage = `url(${TMDB_IMG_BASE}${IMG_SIZE.backdrop}${hero.backdrop_path})`;
        els.heroRelease.textContent = formatYear(hero.release_date);
        els.heroRating.textContent = hero.vote_average.toFixed(1);
        els.heroGenres.textContent = hero.genre_ids?.slice(0, 3).join(', ') || '';
        els.heroOverview.textContent = hero.overview;
        
        const details = await fetchData(`/movie/${hero.id}`);
        els.heroRuntime.textContent = formatRuntime(details.runtime);
        els.heroTitle.textContent = hero.title;
        currentMovie = { ...hero, runtime: details.runtime };
        
        const titleEl = els.heroTitle;
        const text = titleEl.textContent; titleEl.textContent = '';
        let i = 0;
        const type = setInterval(() => {
            if (i < text.length) titleEl.textContent += text.charAt(i++);
            else clearInterval(type);
        }, 80);
        
        els.heroWatchBtn.onclick = () => window.location.href = `view.html?movieId=${hero.id}`;
        els.heroFavBtn.onclick = () => toggleFavoriteState(currentMovie, els.heroFavBtn);
        updateHeroFavBtn();
    } catch (e) { console.error(e); }
};

const updateHeroFavBtn = () => {
    els.heroFavBtn.innerHTML = currentMovie && isFavorite(currentMovie.id) 
        ? '<i class="fa-solid fa-heart text-neon"></i> In Favorites'
        : '<i class="fa-regular fa-heart"></i> Add to Favorites';
};

// 🔍 SEARCH
let searchTimeout;
els.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) { els.searchResults.classList.add('hidden'); return; }
    searchTimeout = setTimeout(async () => {
        try {
            const data = await fetchData('/search/movie', { query });
            if (data.results.length > 0) {
                els.searchResults.classList.remove('hidden');
                els.searchResults.innerHTML = data.results.slice(0, 8).map(m => `
                    <div class="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors search-item" data-id="${m.id}">
                        <img src="${m.poster_path ? TMDB_IMG_BASE + 'w92' + m.poster_path : 'https://placehold.co/92x138?text=?'}" class="w-10 h-14 object-cover rounded">
                        <div>
                            <h4 class="text-sm font-bold text-white">${m.title}</h4>
                            <span class="text-xs text-gray-400">${formatYear(m.release_date)} • ★ ${m.vote_average.toFixed(1)}</span>
                        </div>
                    </div>
                `).join('');
                els.searchResults.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', () => { window.location.href = `view.html?movieId=${item.dataset.id}`; });
                });
            } else { els.searchResults.classList.add('hidden'); }
        } catch (e) { console.error(e); }
    }, 500);
});

// 🎨 THEME
const initTheme = () => {
    const saved = localStorage.getItem('cinemanovaTheme') || 'dark';
    if (saved === 'light') {
        document.documentElement.classList.remove('dark');
        els.themeToggle.classList.replace('bg-gray-700', 'bg-gray-300');
        els.themeIcon.classList.add('rotate-180');
    }
};
els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('cinemanovaTheme', 'light');
        els.themeToggle.classList.replace('bg-gray-700', 'bg-gray-300');
        els.themeIcon.classList.add('rotate-180');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('cinemanovaTheme', 'dark');
        els.themeToggle.classList.replace('bg-gray-300', 'bg-gray-700');
        els.themeIcon.classList.remove('rotate-180');
    }
});

// 📱 UI
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const current = window.scrollY;
    els.navbar.style.transform = current > lastScroll && current > 100 ? 'translateY(-100%)' : 'translateY(0)';
    lastScroll = current;
    els.backToTop.style.transform = current > 500 ? 'translateY(0)' : 'translateY(5rem)';
    els.backToTop.style.opacity = current > 500 ? '1' : '0';
});

els.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
els.mobileMenuBtn.addEventListener('click', () => els.mobileMenu.classList.toggle('hidden'));
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('bg-neon/20', 'border-neon/40'));
        btn.classList.add('bg-neon/20', 'border-neon/40');
        renderTrending(btn.dataset.time);
    });
});

// 🖱️ CURSOR
document.addEventListener('mousemove', (e) => { els.cursor.style.left = e.clientX + 'px'; els.cursor.style.top = e.clientY + 'px'; });
document.querySelectorAll('button, a, .glass-card, .search-item').forEach(el => {
    el.addEventListener('mouseenter', () => els.cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => els.cursor.classList.remove('hover'));
});

// ✨ PARTICLES
const initParticles = () => {
    const ctx = els.particleCanvas.getContext('2d');
    let particles = [];
    const resize = () => { els.particleCanvas.width = innerWidth; els.particleCanvas.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    for (let i=0; i<50; i++) particles.push({
        x: Math.random()*innerWidth, y: Math.random()*innerHeight, s: Math.random()*2+0.5,
        vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, o: Math.random()*0.5+0.1,
        update() { this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>innerWidth) this.vx*=-1; if(this.y<0||this.y>innerHeight) this.vy*=-1; },
        draw() { ctx.fillStyle=`rgba(57,255,20,${this.o})`; ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fill(); }
    });
    const animate = () => { ctx.clearRect(0,0,innerWidth,innerHeight); particles.forEach(p=>{p.update();p.draw();}); requestAnimationFrame(animate); };
    animate();
};

// 🔄 SWIPER INITIALIZATION (RESPONSIVE & BULLET-PROOF)
const initSwiper = (selector, paginationSelector) => {
    const container = document.querySelector(selector);
    if (!container) return;
    
    // Destroy existing instance to prevent duplicates
    if (container.swiper) container.swiper.destroy(true, true);

    new Swiper(container, {
        slidesPerView: 1.6,
        spaceBetween: 12,
        grabCursor: true,
        loop: false,
        speed: 600,
        observer: true,
        observeParents: true,
        pagination: {
            el: paginationSelector,
            clickable: true,
            dynamicBullets: true,
        },
        breakpoints: {
            480: { slidesPerView: 2.2, spaceBetween: 14 },
            640: { slidesPerView: 3, spaceBetween: 16 },
            1024: { slidesPerView: 4.5, spaceBetween: 20 },
            1280: { slidesPerView: 5.5, spaceBetween: 24 },
            1536: { slidesPerView: 6.5, spaceBetween: 28 }
        }
    });
};

// 🔗 CARD CLICK NAVIGATION
const attachCardListeners = (container) => {
    container.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.fav-btn')) return;
            window.location.href = `view.html?movieId=${el.dataset.id}`;
        });
    });
    container.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const data = await fetchData(`/movie/${btn.dataset.id}`);
            toggleFavoriteState(data, btn);
        });
    });
};

// 🚀 INIT
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); initParticles(); renderFavorites();
    document.getElementById('year').textContent = new Date().getFullYear();
    if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY') {
        alert('🎬 Cinemanova Setup\n\nReplace YOUR_TMDB_API_KEY in app.js with your free TMDB API key.\nGet it at: https://www.themoviedb.org/settings/api');
        return;
    }
    loadHero(); renderGenreFilters(); renderTrending(); renderPopular(); renderTopRated();
});
