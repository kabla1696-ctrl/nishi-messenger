// GOAL ZONE — Live Football Scores App
// Data Source: Free World Cup 2026 API (worldcup26.ir)

const API_BASE = 'https://worldcup26.ir';

// State
let allMatches = [];
let allTeams = [];
let allGroups = {};
let allStadiums = {};
let refreshInterval = null;
let refreshCountdown = 30;
let currentFilter = 'all';

// Country flag emojis (fallback)
const FLAG_EMOJI = {
    'MEX': '🇲🇽', 'BRA': '🇧🇷', 'ARG': '🇦🇷', 'FRA': '🇫🇷', 'GER': '🇩🇪',
    'ESP': '🇪🇸', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'ITA': '🇮🇹', 'POR': '🇵🇹', 'NED': '🇳🇱',
    'BEL': '🇧🇪', 'CRO': '🇭🇷', 'JPN': '🇯🇵', 'KOR': '🇰🇷', 'AUS': '🇦🇺',
    'USA': '🇺🇸', 'CAN': '🇨🇦', 'MAR': '🇲🇦', 'SEN': '🇸🇳', 'GHA': '🇬🇭',
    'CMR': '🇨🇲', 'SRB': '🇷🇸', 'SUI': '🇨🇭', 'POL': '🇵🇱', 'DEN': '🇩🇰',
    'TUN': '🇹🇳', 'KSA': '🇸🇦', 'IRN': '🇮🇷', 'URU': '🇺🇾', 'ECU': '🇪🇨',
    'COL': '🇨🇴', 'PER': '🇵🇪', 'CHI': '🇨🇱', 'PAR': '🇵🇾', 'CRC': '🇨🇷',
    'PAN': '🇵🇦', 'HON': '🇭🇳', 'JAM': '🇯🇲', 'HAI': '🇭🇹', 'QAT': '🇶🇦',
    'IRQ': '🇮🇶', 'RSA': '🇿🇦', 'NGA': '🇳🇬', 'CIV': '🇨🇮', 'MLI': '🇲🇱',
    'BFA': '🇧🇫', 'NZL': '🇳🇿', 'UKR': '🇺🇦', 'SWE': '🇸🇪', 'NOR': '🇳🇴',
    'NIR': '🇬🇧', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'WAL': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'GRE': '🇬🇷', 'HUN': '🇭🇺',
    'CZE': '🇨🇿', 'TUR': '🇹🇷', 'RUS': '🇷🇺', 'ROU': '🇷🇴', 'BUL': '🇧🇬',
    'ALB': '🇦🇱', 'ISL': '🇮🇸', 'FIN': '🇫🇮', 'SVK': '🇸🇰', 'SVN': '🇸🇮',
    'BIH': '🇧🇦', 'MNE': '🇲🇪', 'MKD': '🇲🇰', 'GEO': '🇬🇪', 'ARM': '🇦🇲',
    'AZE': '🇦🇿', 'KAZ': '🇰🇿', 'UZB': '🇺🇿', 'CHN': '🇨🇳', 'IND': '🇮🇳',
};

// Build team lookup from fifa_code
let teamLookup = {};

function getFlag(code, name) {
    if (code && FLAG_EMOJI[code]) return FLAG_EMOJI[code];
    if (name && FLAG_EMOJI[name]) return FLAG_EMOJI[name];
    // Try lookup
    if (code && teamLookup[code]) return teamLookup[code];
    return '⚽';
}

// Get stadium name from ID
function getStadium(id) {
    return allStadiums[id] || '';
}

// Format match time
function formatTime(dateStr) {
    if (!dateStr) return '';
    try {
        // Format: "06/11/2026 13:00"
        const [datePart, timePart] = dateStr.split(' ');
        const [month, day, year] = datePart.split('/');
        const d = new Date(`${year}-${month}-${day}T${timePart}:00`);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return dateStr; }
}

// Get match status info
function getStatusInfo(match) {
    const finished = (match.finished || '').toUpperCase() === 'TRUE';
    const timeElapsed = (match.time_elapsed || '').toLowerCase();

    if (finished || timeElapsed === 'finished') {
        return { isLive: false, isFinished: true, isUpcoming: false, text: 'FT', class: 'status-finished', minute: '' };
    }

    // Check for live match (time_elapsed contains minutes like "45", "90+2", etc.)
    if (timeElapsed && timeElapsed !== 'notstarted' && timeElapsed !== 'halftime' && timeElapsed !== 'finished') {
        const minute = timeElapsed === 'halftime' ? 'HT' : timeElapsed + "'";
        return { isLive: true, isFinished: false, isUpcoming: false, text: `🔴 ${minute}`, class: 'status-live', minute };
    }

    if (timeElapsed === 'halftime') {
        return { isLive: true, isFinished: false, isUpcoming: false, text: '🔴 HT', class: 'status-live', minute: 'HT' };
    }

    return {
        isLive: false, isFinished: false, isUpcoming: true,
        text: formatTime(match.local_date),
        class: 'status-upcoming', minute: ''
    };
}

// Create match card HTML
function createMatchCard(match) {
    const homeName = match.home_team_name_en || 'TBD';
    const awayName = match.away_team_name_en || 'TBD';
    const homeCode = match.home_team_fifa_code || match.home_team_code || '';
    const awayCode = match.away_team_fifa_code || match.away_team_code || '';
    const homeScore = match.home_score || '0';
    const awayScore = match.away_score || '0';
    const group = match.group || '';
    const stadium = getStadium(match.stadium_id);
    const status = getStatusInfo(match);

    const isLive = status.isLive;
    const scoreClass = isLive ? 'live-score' : '';

    return `
        <div class="match-card ${isLive ? 'live' : ''}">
            <div class="match-meta">
                <span class="match-group">Group ${group}</span>
                <span class="match-status ${status.class}">${status.text}</span>
            </div>
            <div class="match-teams">
                <div class="team">
                    <div class="team-flag">${getFlag(homeCode, homeName)}</div>
                    <div class="team-name">${homeName}</div>
                    ${homeCode ? `<div class="team-code">${homeCode}</div>` : ''}
                </div>
                <div class="match-score">
                    <div class="score-display ${scoreClass}">${homeScore} - ${awayScore}</div>
                </div>
                <div class="team">
                    <div class="team-flag">${getFlag(awayCode, awayName)}</div>
                    <div class="team-name">${awayName}</div>
                    ${awayCode ? `<div class="team-code">${awayCode}</div>` : ''}
                </div>
            </div>
            ${stadium ? `<div class="match-venue">📍 ${stadium}</div>` : ''}
        </div>
    `;
}

// Render live matches
function renderLiveMatches(matches) {
    const container = document.getElementById('liveMatches');
    const liveBadge = document.getElementById('liveBadge');
    const liveCount = document.getElementById('liveCount');

    const liveMatches = matches.filter(m => {
        const info = getStatusInfo(m);
        return info.isLive;
    });

    if (liveMatches.length > 0) {
        liveBadge.classList.remove('hidden');
        liveCount.textContent = `${liveMatches.length} match${liveMatches.length > 1 ? 'es' : ''}`;
        container.innerHTML = liveMatches.map(createMatchCard).join('');
    } else {
        liveBadge.classList.add('hidden');
        liveCount.textContent = '0 matches';

        // Show today's matches or next upcoming
        const today = new Date();
        const todayStr = `${String(today.getMonth()+1).padStart(2,'0')}/${String(today.getDate()).padStart(2,'0')}/${today.getFullYear()}`;

        const upcoming = matches.filter(m => {
            const info = getStatusInfo(m);
            return info.isUpcoming;
        }).slice(0, 6);

        const finished = matches.filter(m => {
            const info = getStatusInfo(m);
            return info.isFinished;
        }).slice(-3);

        let html = `
            <div class="no-matches">
                <div class="icon">⚽</div>
                <h3>No live matches right now</h3>
            </div>
        `;

        if (finished.length > 0) {
            html += `<p style="color:rgba(255,255,255,0.4);text-align:center;margin:12px 0;font-size:13px">Recent Results</p>`;
            html += finished.map(createMatchCard).join('');
        }

        if (upcoming.length > 0) {
            html += `<p style="color:rgba(255,255,255,0.4);text-align:center;margin:16px 0 12px;font-size:13px">Upcoming</p>`;
            html += upcoming.map(createMatchCard).join('');
        }

        container.innerHTML = html;
    }
}

// Render schedule
function renderSchedule(matches) {
    const container = document.getElementById('scheduleMatches');
    let filtered = matches;

    if (currentFilter === 'today') {
        const now = new Date();
        const todayMMDD = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
        filtered = matches.filter(m => (m.local_date || '').includes(todayMMDD));
    } else if (currentFilter === 'tomorrow') {
        const tomorrow = new Date(Date.now() + 86400000);
        const tomorrowMMDD = `${String(tomorrow.getMonth()+1).padStart(2,'0')}/${String(tomorrow.getDate()).padStart(2,'0')}`;
        filtered = matches.filter(m => (m.local_date || '').includes(tomorrowMMDD));
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-matches">
                <div class="icon">📅</div>
                <h3>No matches found</h3>
                <p>Try a different filter</p>
            </div>
        `;
    } else {
        container.innerHTML = filtered.map(createMatchCard).join('');
    }
}

// Filter schedule
function filterSchedule(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderSchedule(allMatches);
}

// Render standings
function renderStandings(groups) {
    const container = document.getElementById('standingsContent');

    // Groups is an array of objects with { name: "A", teams: [...] }
    if (!groups || (Array.isArray(groups) && groups.length === 0)) {
        container.innerHTML = `
            <div class="no-matches" style="grid-column:1/-1">
                <div class="icon">🏆</div>
                <h3>Standings not available yet</h3>
            </div>
        `;
        return;
    }

    const groupList = Array.isArray(groups) ? groups : Object.values(groups);

    let html = '';
    for (const group of groupList) {
        const groupName = group.name || group.group || '?';
        const teams = group.teams || [];

        // Sort by points, then goal difference
        const sorted = [...teams].sort((a, b) => {
            const ptsDiff = (parseInt(b.pts) || 0) - (parseInt(a.pts) || 0);
            if (ptsDiff !== 0) return ptsDiff;
            return (parseInt(b.gd) || 0) - (parseInt(a.gd) || 0);
        });

        html += `
            <div class="group-card">
                <div class="group-header">🏆 Group ${groupName}</div>
                <table class="group-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((t, i) => {
                            // Get team name from team_id lookup
                            const teamInfo = teamLookup[t.team_id] || {};
                            const teamName = teamInfo.name || `Team ${t.team_id}`;
                            const teamCode = teamInfo.code || '';
                            return `
                                <tr class="${i < 2 ? 'qualified' : ''}">
                                    <td>${i + 1}</td>
                                    <td>${getFlag(teamCode, teamName)} ${teamName}</td>
                                    <td>${t.mp || 0}</td>
                                    <td>${t.w || 0}</td>
                                    <td>${t.d || 0}</td>
                                    <td>${t.l || 0}</td>
                                    <td>${t.gd || 0}</td>
                                    <td><strong>${t.pts || 0}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Render teams
function renderTeams(teams) {
    const container = document.getElementById('teamsContent');
    if (!teams || teams.length === 0) {
        container.innerHTML = `
            <div class="no-matches" style="grid-column:1/-1">
                <div class="icon">👥</div>
                <h3>Teams data loading...</h3>
            </div>
        `;
        return;
    }

    container.innerHTML = teams.map(t => {
        const name = t.name_en || t.name || 'Unknown';
        const code = t.fifa_code || '';
        return `
            <div class="team-card">
                <div class="team-card-flag">${getFlag(code, name)}</div>
                <div class="team-card-name">${name}</div>
                ${code ? `<div class="team-card-code">${code}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Search teams
function searchTeams(query) {
    const filtered = allTeams.filter(t => {
        const name = (t.name_en || t.name || '').toLowerCase();
        const code = (t.fifa_code || '').toLowerCase();
        return name.includes(query.toLowerCase()) || code.includes(query.toLowerCase());
    });
    renderTeams(filtered);
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// Fetch data from API
async function fetchData() {
    try {
        const [gamesRes, groupsRes, teamsRes, stadiumsRes] = await Promise.allSettled([
            fetch(`${API_BASE}/get/games`),
            fetch(`${API_BASE}/get/groups`),
            fetch(`${API_BASE}/get/teams`),
            fetch(`${API_BASE}/get/stadiums`)
        ]);

        // Process teams first (for lookup)
        if (teamsRes.status === 'fulfilled') {
            const teamsData = await teamsRes.value.json();
            allTeams = Array.isArray(teamsData) ? teamsData : (teamsData.data || []);
            // Build lookup: team_id -> {name, code}
            allTeams.forEach(t => {
                const name = t.name_en || t.name || '';
                const code = t.fifa_code || '';
                if (t.id) teamLookup[t.id] = { name, code };
                if (code) teamLookup[code] = { name, code };
            });
            renderTeams(allTeams);
        }

        // Process stadiums
        if (stadiumsRes.status === 'fulfilled') {
            const stadiumsData = await stadiumsRes.value.json();
            const stadiums = Array.isArray(stadiumsData) ? stadiumsData : (stadiumsData.data || []);
            stadiums.forEach(s => {
                if (s.id) allStadiums[s.id] = s.name_en || s.fifa_name || '';
            });
        }

        // Process matches
        if (gamesRes.status === 'fulfilled') {
            const gamesData = await gamesRes.value.json();
            allMatches = Array.isArray(gamesData) ? gamesData : (gamesData.data || []);
            renderLiveMatches(allMatches);
            renderSchedule(allMatches);
        }

        // Process groups/standings
        if (groupsRes.status === 'fulfilled') {
            const groupsData = await groupsRes.value.json();
            allGroups = groupsData.data || groupsData;
            renderStandings(allGroups);
        }

        console.log(`✅ Data loaded: ${allMatches.length} matches, ${allTeams.length} teams`);

    } catch (error) {
        console.error('❌ Error fetching data:', error);
        document.getElementById('liveMatches').innerHTML = `
            <div class="no-matches">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Could not load match data. Retrying...</p>
            </div>
        `;
    }
}

// Auto-refresh countdown
function startRefreshTimer() {
    refreshCountdown = 30;
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        refreshCountdown--;
        document.getElementById('refreshTimer').textContent = refreshCountdown;
        if (refreshCountdown <= 0) {
            fetchData();
            refreshCountdown = 30;
        }
    }, 1000);
}

// Particle background
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 40;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.3 + 0.1
        };
    }

    function init() {
        resize();
        particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(76, 175, 80, ${p.opacity})`;
            ctx.fill();
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
        requestAnimationFrame(animate);
    }

    init();
    animate();
    window.addEventListener('resize', resize);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    fetchData();
    startRefreshTimer();
});
