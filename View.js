/**
 * Cinemanova - View Page Logic
 * Handles movie details, YouTube trailer embed, cast, and favorites
 */
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // 🔑 Must match app.js
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/';

const els = {
    loading: document.getElementById('loading-view'),
    content: document.getElementById('movie-content'),
    backdrop: document.getElementById('v-backdrop'),
    title: document.getElementById('v-title'),
    badge: document.getElementById('v-badge'),
    rating: document.getElementById('v-rating').querySelector('span'),
    runtime: document.getElementById('v-runtime'),
    release: document.getElementById('v-release'),
    lang: document.getElementById('v-lang'),
    genres: document.getElementById('v-genres'),
    overview: document.getElementById('v-overview'),
    cast: document.getElementById('v-cast'),
    trailerBox: document.getElementById('v-trailer-box'),
    noTrailer: document.getElementById('no-trailer'),
    voteCount: document.getElementById('v-vote-count'),
    popularity: document.getElementById('v-popularity'),
    favBtn: document.getElementById('v-fav-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    cursor: document.getElementById('cursor'),
    particleCanvas: document.getElementById('particle-bg')
};

const formatRuntime = m => m ? `${Math.floor(m/60)}h ${m%60}m` : 'N/A';
const isFavorite = id => JSON.parse(localStorage.getItem('cinemanovaFavorites')||'[]').some(f=>f.id===id);

const fetchData = async (endpoint, params={}) => {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(([k,v])=>url.searchParams.append(k,v));
    const res = await fetch(url);
    if(!res.ok) throw new Error('TMDB Error');
    return res.json();
};

const loadMovie = async () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    if (!movieId) { window.location.href = 'index.html'; return; }

    try {
        const movie = await fetchData(`/movie/${movieId}`);
        const credits = await fetchData(`/movie/${movieId}/credits`);
        const videos = await fetchData(`/movie/${movieId}/videos`);
        
        // Render Data
        els.backdrop.src = movie.backdrop_path ? `${TMDB_IMG_BASE}original${movie.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop';
        els.title.textContent = movie.title;
        els.badge.textContent = movie.status.toUpperCase();
        els.rating.textContent = movie.vote_average.toFixed(1);
        els.runtime.innerHTML = `<i class="fa-solid fa-clock text-neon mr-1"></i> ${formatRuntime(movie.runtime)}`;
        els.release.innerHTML = `<i class="fa-solid fa-calendar text-neon mr-1"></i> ${movie.release_date || 'TBA'}`;
        els.lang.textContent = movie.original_language.toUpperCase();
        els.overview.textContent = movie.overview || 'No synopsis available.';
        els.voteCount.textContent = (movie.vote_count||0).toLocaleString();
        els.popularity.textContent = Math.round(movie.popularity||0).toLocaleString();

        els.genres.innerHTML = (movie.genres||[]).map(g => 
            `<span class="px-3 py-1 bg-neon/20 text-neon rounded-full text-xs font-bold border border-neon/30">${g.name}</span>`
        ).join('');

        els.cast.innerHTML = credits.cast.slice(0,8).map(c => `
            <div class="flex flex-col items-center p-3 bg-black/20 rounded-lg hover:bg-white/5 transition-colors">
                <img src="${c.profile_path ? TMDB_IMG_BASE+'w185'+c.profile_path : 'https://placehold.co/185x185?text=?'}" 
                     class="w-16 h-16 rounded-full object-cover mb-2 border border-neon/30">
                <span class="text-sm font-bold text-white line-clamp-1 text-center">${c.name}</span>
                <span class="text-xs text-gray-400 line-clamp-1 text-center">${c.character}</span>
            </div>
        `).join('');

        // YouTube Trailer Embed
        const trailer = videos.results.find(v => v.site==='YouTube' && v.type==='Trailer') || videos.results.find(v => v.site==='YouTube');
        if (trailer) {
            els.trailerBox.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=0&modestbranding=1&rel=0&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            els.noTrailer.classList.add('hidden');
        } else {
            els.trailerBox.innerHTML = `<div class="text-center p-6"><i class="fa-brands fa-youtube text-4xl text-gray-600 mb-2"></i><p class="text-gray-400">No official trailer found</p></div>`;
        }

        // Favorites
        els.favBtn.onclick = () => {
            let favs = JSON.parse(localStorage.getItem('cinemanovaFavorites')||'[]');
            const idx = favs.findIndex(f => f.id === movie.id);
            if (idx > -1) { favs.splice(idx,1); els.favBtn.innerHTML='<i class="fa-regular fa-heart"></i> Add to Favorites'; }
            else { favs.push(movie); els.favBtn.innerHTML='<i class="fa-solid fa-heart text-neon"></i> Remove from Favorites'; }
            localStorage.setItem('cinemanovaFavorites', JSON.stringify(favs));
        };
        els.favBtn.innerHTML = isFavorite(movie.id) ? '<i class="fa-solid fa-heart text-neon"></i> Remove from Favorites' : '<i class="fa-regular fa-heart"></i> Add to Favorites';

        els.loading.classList.add('hidden');
        els.content.classList.remove('hidden');
    } catch (e) {
        console.error(e);
        els.loading.innerHTML = `<p class="text-red-400">Failed to load movie. <a href="index.html" class="text-neon underline">Go Home</a></p>`;
    }
};

// Theme & Cursor (Reused logic)
const initTheme = () => {
    const saved = localStorage.getItem('cinemanovaTheme')||'dark';
    if(saved==='light') {
        document.documentElement.classList.remove('dark');
        els.themeToggle.classList.replace('bg-gray-700','bg-gray-300');
        els.themeIcon.classList.add('rotate-180');
    }
};
els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if(isDark) {
        document.documentElement.classList.remove('dark'); localStorage.setItem('cinemanovaTheme','light');
        els.themeToggle.classList.replace('bg-gray-700','bg-gray-300'); els.themeIcon.classList.add('rotate-180');
    } else {
        document.documentElement.classList.add('dark'); localStorage.setItem('cinemanovaTheme','dark');
        els.themeToggle.classList.replace('bg-gray-300','bg-gray-700'); els.themeIcon.classList.remove('rotate-180');
    }
});

document.addEventListener('mousemove', e => { els.cursor.style.left=e.clientX+'px'; els.cursor.style.top=e.clientY+'px'; });
document.querySelectorAll('button, a, .glass-card').forEach(el => {
    el.addEventListener('mouseenter', () => els.cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => els.cursor.classList.remove('hover'));
});

// Particles
const initParticles = () => {
    const ctx = els.particleCanvas.getContext('2d'); let particles=[];
    const resize = () => { els.particleCanvas.width=innerWidth; els.particleCanvas.height=innerHeight; };
    resize(); addEventListener('resize', resize);
    for(let i=0; i<40; i++) particles.push({
        x:Math.random()*innerWidth, y:Math.random()*innerHeight, s:Math.random()*2+0.5, vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4, o:Math.random()*0.5+0.1,
        update(){ this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>innerWidth) this.vx*=-1; if(this.y<0||this.y>innerHeight) this.vy*=-1; },
        draw(){ ctx.fillStyle=`rgba(57,255,20,${this.o})`; ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fill(); }
    });
    const animate = () => { ctx.clearRect(0,0,innerWidth,innerHeight); particles.forEach(p=>{p.update();p.draw();}); requestAnimationFrame(animate); };
    animate();
};

document.addEventListener('DOMContentLoaded', () => { initTheme(); initParticles(); loadMovie(); });
