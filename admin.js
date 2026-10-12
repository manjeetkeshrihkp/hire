// Firebase Compat SDK — works when opening files directly without a server

const firebaseConfig = {
    apiKey: "AIzaSyD47KU1-IDToLW2W5GhAqSOg_-TuNBXGh0",
    authDomain: "elitex-media.firebaseapp.com",
    projectId: "elitex-media",
    storageBucket: "elitex-media.firebasestorage.app",
    messagingSenderId: "844571766791",
    appId: "1:844571766791:web:8253f5944ae36cd309baa2",
    measurementId: "G-DWLFYJQDY4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// In-memory state
let applicationsCache = [];
let hrPartnersCache = [];
let activeSectionFilter = 'all'; // 'all', 'direct', or hrCode
let viewMode = 'tabs'; // 'tabs' (focus one at a time) or 'stacked' (all visible)
let currentAdminView = 'home'; // 'home' (dashboard of all data) or 'hr'
let isSlugManuallyEdited = false;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getBaseUrl() {
    const custom = (localStorage.getItem('elitex_custom_domain') || '').trim();
    if (custom) return custom;

    try {
        const origin = window.location.origin;
        const pathname = window.location.pathname.replace(/admin\.html.*$/, 'index.html');
        if (origin && origin !== 'null') {
            return `${origin}${pathname}`;
        }
    } catch (e) {}

    return window.location.href.replace(/admin\.html.*$/, 'index.html');
}

function buildHrLink(code) {
    const base = getBaseUrl();
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}hr=${encodeURIComponent(code)}`;
}

// ─── Sidebar Drawer Open / Close Controls ───────────────────────────────────
function openSidebar() {
    const drawer = document.getElementById('sidebarDrawer');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
}

function closeSidebar() {
    const drawer = document.getElementById('sidebarDrawer');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
}

// ─── View Switcher: Home Dashboard vs HR Dashboard ─────────────────────────
function switchView(viewName) {
    if (viewName === 'dashboard') viewName = 'home';
    currentAdminView = viewName;
    const viewHome = document.getElementById('viewHome') || document.getElementById('viewDashboard');
    const viewHr = document.getElementById('viewHrDashboard');
    const sideBtnHome = document.getElementById('sideBtnHome');
    const sideBtnDash = document.getElementById('sideBtnDashboard');
    const sideBtnHr = document.getElementById('sideBtnHr');
    const navItemHome = document.getElementById('navItemHome');
    const navItemDash = document.getElementById('navItemDashboard');
    const navItemHr = document.getElementById('navItemHr');
    const currentViewBadge = document.getElementById('currentViewBadge');

    if (viewName === 'hr') {
        if (viewHome) viewHome.classList.add('hidden');
        if (viewHr) viewHr.classList.remove('hidden');
        if (sideBtnHome) sideBtnHome.classList.remove('active');
        if (sideBtnDash) sideBtnDash.classList.remove('active');
        if (sideBtnHr) sideBtnHr.classList.add('active');
        if (navItemHome) navItemHome.classList.remove('active');
        if (navItemDash) navItemDash.classList.remove('active');
        if (navItemHr) navItemHr.classList.add('active');
        if (currentViewBadge) {
            currentViewBadge.innerHTML = '<i class="fa-solid fa-users-gear"></i> HR Dashboard';
            currentViewBadge.style.color = '#c084fc';
            currentViewBadge.style.background = 'rgba(168, 85, 247, 0.12)';
            currentViewBadge.style.borderColor = 'rgba(168, 85, 247, 0.25)';
        }
        try { history.replaceState(null, null, '#hr-dashboard'); } catch(e){}
        renderNavigationDeck();
        renderAllSections();
    } else {
        if (viewHr) viewHr.classList.add('hidden');
        if (viewHome) viewHome.classList.remove('hidden');
        if (sideBtnHr) sideBtnHr.classList.remove('active');
        if (sideBtnHome) sideBtnHome.classList.add('active');
        if (sideBtnDash) sideBtnDash.classList.add('active');
        if (navItemHr) navItemHr.classList.remove('active');
        if (navItemHome) navItemHome.classList.add('active');
        if (navItemDash) navItemDash.classList.add('active');
        if (currentViewBadge) {
            currentViewBadge.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Dashboard';
            currentViewBadge.style.color = '#60a5fa';
            currentViewBadge.style.background = 'rgba(59, 130, 246, 0.12)';
            currentViewBadge.style.borderColor = 'rgba(59, 130, 246, 0.25)';
        }
        try { history.replaceState(null, null, '#dashboard'); } catch(e){}
        renderHomeDashboard();
    }

    closeSidebar();
}

window.switchToHrDashboard = () => switchView('hr');
window.switchToHomeDashboard = () => switchView('home');
window.switchToMainDashboard = () => switchView('home');

// ─── HR Sub-View Switcher (Overview / Onboard / Database) ───────────────────
let currentHrSubView = 'overview';

function switchToHrSubView(subView) {
    // First make sure we're on HR main view
    if (currentAdminView !== 'hr') switchView('hr');

    currentHrSubView = subView;

    // All sub-view divs
    const panels = {
        overview: document.getElementById('hrSubViewOverview'),
        onboard:  document.getElementById('hrSubViewOnboard'),
        database: document.getElementById('hrSubViewDatabase'),
    };
    // All tab buttons
    const tabs = {
        overview: document.getElementById('hrTabOverview'),
        onboard:  document.getElementById('hrTabOnboard'),
        database: document.getElementById('hrTabDatabase'),
    };
    // Sidebar sub-buttons
    const sideBtns = {
        onboard:  document.getElementById('sideBtnOnboardHr'),
        database: document.getElementById('sideBtnHrDatabase'),
    };

    // Hide all, deactivate all tabs
    Object.values(panels).forEach(p => p && p.classList.add('hidden'));
    Object.values(tabs).forEach(t => t && t.classList.remove('active'));
    Object.values(sideBtns).forEach(b => b && b.classList.remove('active'));

    // Show target
    if (panels[subView]) panels[subView].classList.remove('hidden');
    if (tabs[subView]) tabs[subView].classList.add('active');

    // Update title & desc
    const titleEl = document.getElementById('hrSubViewTitle');
    const descEl  = document.getElementById('hrSubViewDesc');
    const titles = {
        overview: 'HR Recruiter Partner Dashboard',
        onboard:  'Onboard New HR Partner',
        database: 'HR Hiring Candidate Database',
    };
    const descs = {
        overview: 'Custom tracking links, recruiter directories, and separate candidate sections for each HR',
        onboard:  'Create a unique tracking link and dedicated candidate pool section for a new recruiter',
        database: 'All candidates referred by HR recruiters — filter by partner, experience, state',
    };
    if (titleEl) titleEl.textContent = titles[subView] || titles.overview;
    if (descEl)  descEl.textContent  = descs[subView]  || descs.overview;

    // Sidebar active state
    if (subView === 'onboard' && sideBtns.onboard)   sideBtns.onboard.classList.add('active');
    if (subView === 'database' && sideBtns.database)  sideBtns.database.classList.add('active');

    // If switching to database — render it
    if (subView === 'database') renderHrDatabase();

    // If switching to onboard — populate current HR list
    if (subView === 'onboard') renderOnboardedHrList();

    closeSidebar();
}
window.switchToHrSubView = switchToHrSubView;

// ─── Render Onboarded HR List (in Onboard sub-view) ─────────────────────────
function renderOnboardedHrList() {
    const container = document.getElementById('onboardedHrList');
    if (!container) return;
    if (!hrPartnersCache || hrPartnersCache.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;">No HR partners onboarded yet.</p>';
        return;
    }
    container.innerHTML = hrPartnersCache.map(hr => {
        const link = buildHrLink(hr.code || hr.id);
        const leads = (applicationsCache || []).filter(a => (a.hr||'').toLowerCase() === (hr.code||hr.id||'').toLowerCase()).length;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:50%;background:rgba(192,132,252,0.12);display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;color:#c084fc;">${escapeHtml((hr.name||'?')[0].toUpperCase())}</div>
                <div>
                    <div style="font-weight:600;font-size:0.88rem;">${escapeHtml(hr.name||hr.id)}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Code: ${escapeHtml(hr.code||hr.id)} · ${leads} lead${leads!==1?'s':''}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;">
                <button onclick="navigator.clipboard.writeText('${escapeHtml(link)}')" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-size:0.75rem;cursor:pointer;" title="Copy link">
                    <i class="fa-solid fa-copy"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ─── Render HR Database Table ────────────────────────────────────────────────
function renderHrDatabase() {
    const tbody = document.getElementById('hrDatabaseTableBody');
    const rowCount = document.getElementById('hrDbRowCount');
    const hrFilter = (document.getElementById('hrDbFilterHr') || {}).value || '';
    const expFilter = (document.getElementById('hrDbFilterExp') || {}).value || '';
    const search = ((document.getElementById('hrDbSearch') || {}).value || '').toLowerCase().trim();

    // Populate HR filter dropdown
    const hrSel = document.getElementById('hrDbFilterHr');
    if (hrSel && hrSel.options.length <= 1 && hrPartnersCache.length > 0) {
        hrPartnersCache.forEach(hr => {
            const opt = document.createElement('option');
            opt.value = hr.code || hr.id;
            opt.textContent = hr.name || hr.id;
            hrSel.appendChild(opt);
        });
    }

    if (!tbody) return;

    // Filter: only HR-referred candidates
    let rows = (applicationsCache || []).filter(a => a.hr && a.hr.trim() !== '');

    if (hrFilter) rows = rows.filter(a => (a.hr||'').toLowerCase() === hrFilter.toLowerCase());
    if (expFilter) rows = rows.filter(a => expFilter === 'fresher' ? !a.experience || Number(a.experience) === 0 : Number(a.experience) > 0);
    if (search) rows = rows.filter(a => {
        const blob = [a.name,a.email,a.phone,a.hr,a.state,a.skills].join(' ').toLowerCase();
        return blob.includes(search);
    });

    if (rowCount) rowCount.textContent = `Showing ${rows.length} HR candidate${rows.length !== 1 ? 's' : ''}`;

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-secondary);">
            <i class="fa-solid fa-inbox" style="font-size:1.8rem;display:block;margin-bottom:8px;"></i>No HR candidates match the filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(a => {
        const date = a.timestamp ? new Date(a.timestamp.seconds ? a.timestamp.seconds*1000 : a.timestamp).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
        const hrName = hrPartnersCache.find(h => (h.code||h.id||'').toLowerCase() === (a.hr||'').toLowerCase());
        const expYrs = Number(a.experience||0);
        const expLabel = expYrs === 0 ? '<span style="color:#60a5fa;font-size:0.75rem;">Fresher</span>' : `<span style="color:#4ade80;font-size:0.75rem;">${expYrs}y Exp</span>`;
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
            <td style="padding:11px 14px;white-space:nowrap;color:var(--text-secondary);font-size:0.78rem;">${date}</td>
            <td style="padding:11px 14px;font-weight:600;">${escapeHtml(a.name||'—')}</td>
            <td style="padding:11px 14px;color:var(--text-secondary);font-size:0.8rem;">${escapeHtml(a.email||'')} ${a.phone?`<br>${escapeHtml(a.phone)}`:''}  </td>
            <td style="padding:11px 14px;">
                <span style="padding:3px 8px;border-radius:5px;background:rgba(192,132,252,0.1);color:#c084fc;font-size:0.76rem;font-weight:600;">${escapeHtml(hrName?hrName.name:a.hr)}</span>
            </td>
            <td style="padding:11px 14px;font-size:0.82rem;">${escapeHtml(a.state||'—')}</td>
            <td style="padding:11px 14px;">${expLabel}</td>
            <td style="padding:11px 14px;font-size:0.78rem;color:var(--text-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(a.skills||'')}">${escapeHtml(a.skills||'—')}</td>
        </tr>`;
    }).join('');
}
window.renderHrDatabase = renderHrDatabase;

// ─── Export HR Database to CSV ───────────────────────────────────────────────
window.exportHrDatabaseCsv = function() {
    const rows = (applicationsCache || []).filter(a => a.hr && a.hr.trim() !== '');
    if (!rows.length) { alert('No HR candidate data to export.'); return; }
    const headers = ['Date','Name','Email','Phone','HR Partner','State','Experience (yrs)','Skills','10th %','12th %'];
    const csvRows = [headers.join(',')];
    rows.forEach(a => {
        const date = a.timestamp ? new Date(a.timestamp.seconds ? a.timestamp.seconds*1000 : a.timestamp).toLocaleDateString('en-IN') : '';
        const hrName = hrPartnersCache.find(h => (h.code||h.id||'').toLowerCase() === (a.hr||'').toLowerCase());
        csvRows.push([date, a.name||'', a.email||'', a.phone||'', hrName?hrName.name:a.hr, a.state||'', a.experience||0, a.skills||'', a.marks10||'', a.marks12||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='elitex_hr_candidates.csv'; a.click();
    URL.revokeObjectURL(url);
};

// ─── Local Storage Cache for HR Partners ────────────────────────────────────
function loadHrCacheFromLocalStorage() {
    try {
        const saved = localStorage.getItem('elitex_hr_partners_cache');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveHrCacheToLocalStorage(list) {
    try {
        localStorage.setItem('elitex_hr_partners_cache', JSON.stringify(list));
    } catch (e) {}
}

// ─── Fetch HR Partners ──────────────────────────────────────────────────────
async function fetchHrPartners() {
    try {
        const snapshot = await db.collection("hr_partners")
            .orderBy("createdAt", "desc")
            .get();

        const partners = [];
        snapshot.forEach(doc => {
            partners.push({ id: doc.id, ...doc.data() });
        });

        hrPartnersCache = partners;
        saveHrCacheToLocalStorage(partners);
    } catch (err) {
        console.warn("Could not load hr_partners from Firestore, falling back to local cache:", err);
        hrPartnersCache = loadHrCacheFromLocalStorage();
    }

    updateStats();
}

// ─── Save New HR Partner ────────────────────────────────────────────────────
async function saveHrPartner(name, rawCode) {
    const code = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!name || !code) {
        alert("Please provide both an HR Name and a valid alphanumeric code.");
        return;
    }

    if (hrPartnersCache.some(h => h.code.toLowerCase() === code)) {
        alert(`An HR partner with the code "${code}" already exists! Please choose a different code.`);
        return;
    }

    const newPartner = {
        name: name.trim(),
        code: code,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtLocal: new Date().toISOString()
    };

    try {
        const docRef = await db.collection("hr_partners").add(newPartner);
        newPartner.id = docRef.id;
    } catch (err) {
        console.warn("Firestore error adding hr_partner, saving to local cache:", err);
        newPartner.id = 'local_' + Date.now();
    }

    hrPartnersCache.unshift(newPartner);
    saveHrCacheToLocalStorage(hrPartnersCache);

    activeSectionFilter = code;
    updateStats();
    renderNavigationDeck();
    renderAllSections();
    renderMasterApplicationsTable();

    setTimeout(() => scrollToSection(`section_${code}`), 100);
}

// ─── Delete HR Partner ──────────────────────────────────────────────────────
async function deleteHrPartner(id, code) {
    if (!confirm(`Are you sure you want to remove the section for HR "${code}"? Existing candidates submitted under this code will be preserved.`)) {
        return;
    }

    try {
        if (id && !id.startsWith('local_')) {
            await db.collection("hr_partners").doc(id).delete();
        }
    } catch (err) {
        console.warn("Firestore error deleting hr_partner:", err);
    }

    hrPartnersCache = hrPartnersCache.filter(h => h.code.toLowerCase() !== code.toLowerCase());
    saveHrCacheToLocalStorage(hrPartnersCache);

    if (activeSectionFilter === code) {
        activeSectionFilter = 'all';
    }

    updateStats();
    renderNavigationDeck();
    renderAllSections();
    renderMasterApplicationsTable();
}

// ─── Copy Link Helper ───────────────────────────────────────────────────────
function copyLink(code, btn) {
    const link = buildHrLink(code);
    navigator.clipboard.writeText(link).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        btn.style.background = '#4ade80';
        btn.style.color = '#000';
        setTimeout(() => {
            btn.innerHTML = orig;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        prompt("Copy this link:", link);
    });
}

// ─── Candidate Row Markup Generator ─────────────────────────────────────────
function buildCandidateRowHtml(app, includeSourceBadge = false) {
    const date = app.timestamp ? app.timestamp.toDate().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }) : 'N/A';

    const name = escapeHtml(
        app.firstName
            ? `${app.firstName} ${app.lastName || ''}`.trim()
            : (app.name || 'Anonymous')
    );

    const genderBadge = app.gender ? `<span class="badge">${escapeHtml(app.gender)}</span>` : '';
    const stateText = escapeHtml(app.state || '—');

    // Contact
    const emailLink = app.email
        ? `<a href="mailto:${escapeHtml(app.email)}"><i class="fa-solid fa-envelope"></i> ${escapeHtml(app.email)}</a>`
        : '—';

    let phoneLink = '';
    if (app.phone || app.rawPhone) {
        const raw = (app.rawPhone || app.phone.replace('+91', '')).replace(/\D/g, '');
        const displayPhone = app.phone || `+91 ${raw}`;
        phoneLink = `
            <a href="tel:+91${raw}" title="Call applicant"><i class="fa-solid fa-phone"></i> ${escapeHtml(displayPhone)}</a>
            <a href="https://wa.me/91${raw}" target="_blank" title="WhatsApp applicant" style="color: #25D366; font-size: 0.76rem;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
        `;
    }

    // Source Badge
    let sourceHtml = '';
    if (includeSourceBadge) {
        const refCode = (app.referredBy || 'direct').trim().toLowerCase();
        if (refCode === 'direct') {
            sourceHtml = `<td><span class="badge badge-direct"><i class="fa-solid fa-earth-americas"></i> Direct</span></td>`;
        } else {
            const hr = hrPartnersCache.find(h => h.code.toLowerCase() === refCode);
            const hrName = hr ? hr.name : refCode.toUpperCase();
            sourceHtml = `<td><span class="badge badge-hr" title="Referred by ${escapeHtml(hrName)}"><i class="fa-solid fa-user-tag"></i> ${escapeHtml(hrName)} <small style="font-family:monospace; opacity:0.8;">(${escapeHtml(refCode)})</small></span></td>`;
        }
    }

    // Experience
    let expBadge = '<span class="badge">—</span>';
    if (app.experience) {
        const isFresher = app.experience.includes('0') || app.experience.toLowerCase().includes('fresher');
        expBadge = `<span class="badge ${isFresher ? 'badge-fresher' : 'badge-exp'}">${escapeHtml(app.experience)}</span>`;
    }

    // Academics
    const c10 = app.class10 === true ? 'Completed' : (typeof app.class10 === 'number' ? `${app.class10}%` : 'Not completed');
    const c12 = app.class12 === true ? 'Completed' : (typeof app.class12 === 'number' ? `${app.class12}%` : 'Not completed');
    const academicHtml = `
        <div class="marks-tag">10th: <strong>${c10}</strong></div>
        <div class="marks-tag">12th: <strong>${c12}</strong></div>
    `;

    // Skills & Language
    const skillsText = escapeHtml(app.skills || '—');
    const langBadge = app.language ? `<span class="badge" style="margin-top: 4px;">${escapeHtml(app.language)}</span>` : '';

    // Links
    const resumeUrl = app.resume || app.portfolio;
    const resumeBtn = resumeUrl
        ? `<a href="${encodeURI(resumeUrl)}" target="_blank" rel="noopener noreferrer" class="btn-link"><i class="fa-solid fa-file-lines"></i> Resume</a>`
        : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No link</span>';

    const linkedinBtn = app.linkedin
        ? `<a href="${encodeURI(app.linkedin)}" target="_blank" rel="noopener noreferrer" class="btn-link linkedin"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`
        : '';

    return `
        <tr>
            <td style="color: var(--text-secondary); white-space: nowrap; font-size: 0.82rem;">${date}</td>
            <td>
                <div class="candidate-cell">
                    <span class="candidate-name">${name}</span>
                    ${genderBadge}
                </div>
            </td>
            <td>
                <div class="contact-cell">
                    ${emailLink}
                    ${phoneLink}
                </div>
            </td>
            ${sourceHtml}
            <td style="white-space: nowrap;">${stateText}</td>
            <td>${expBadge}</td>
            <td>${academicHtml}</td>
            <td>
                <div class="skills-tag" title="${skillsText}">${skillsText}</div>
                ${langBadge}
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${resumeBtn}
                    ${linkedinBtn}
                </div>
            </td>
        </tr>
    `;
}

// ─── Search Filtering Helper ─────────────────────────────────────────────────
function candidateMatchesSearch(app, query) {
    if (!query) return true;
    const name = (app.firstName ? `${app.firstName} ${app.lastName || ''}` : (app.name || '')).toLowerCase();
    const email = (app.email || '').toLowerCase();
    const phone = (app.phone || app.rawPhone || '').toLowerCase();
    const state = (app.state || '').toLowerCase();
    const skills = (app.skills || '').toLowerCase();
    const exp = (app.experience || '').toLowerCase();
    const ref = (app.referredBy || '').toLowerCase();

    return name.includes(query) ||
           email.includes(query) ||
           phone.includes(query) ||
           state.includes(query) ||
           skills.includes(query) ||
           exp.includes(query) ||
           ref.includes(query);
}

// ─── Group Applications Helper ──────────────────────────────────────────────
function getGroupedApplications() {
    const grouped = {
        direct: []
    };

    hrPartnersCache.forEach(hr => {
        grouped[hr.code.toLowerCase()] = [];
    });

    applicationsCache.forEach(app => {
        const ref = (app.referredBy || 'direct').trim().toLowerCase();
        if (ref === 'direct') {
            grouped.direct.push(app);
        } else {
            if (!grouped[ref]) {
                grouped[ref] = [];
            }
            grouped[ref].push(app);
        }
    });

    const registeredCodes = new Set(hrPartnersCache.map(h => h.code.toLowerCase()));
    const unmappedCodes = [];
    Object.keys(grouped).forEach(code => {
        if (code !== 'direct' && !registeredCodes.has(code)) {
            unmappedCodes.push(code);
        }
    });

    return { grouped, unmappedCodes };
}

// ─── RENDER VIEW 1: HOME · DASHBOARD OF ALL DATA ───────────────────────────
function renderAnalyticsWidgets() {
    const total = applicationsCache.length;
    let directCount = 0;
    let hrCount = 0;
    let fresherCount = 0;
    let expCount = 0;
    const stateFreq = {};
    const hrLeadsMap = {};

    // Initialize counts for each registered HR partner
    hrPartnersCache.forEach(hr => {
        hrLeadsMap[hr.code.toLowerCase()] = { hr, count: 0 };
    });

    applicationsCache.forEach(app => {
        const ref = (app.referredBy || 'direct').trim().toLowerCase();
        if (ref === 'direct') {
            directCount++;
        } else {
            hrCount++;
            if (!hrLeadsMap[ref]) {
                const partner = hrPartnersCache.find(h => h.code.toLowerCase() === ref);
                hrLeadsMap[ref] = { hr: partner || { name: ref.toUpperCase(), code: ref }, count: 0 };
            }
            hrLeadsMap[ref].count++;
        }

        const exp = (app.experience || '').toLowerCase();
        if (exp.includes('0') || exp.includes('fresher')) {
            fresherCount++;
        } else if (exp.includes('1') || exp.includes('2') || exp.includes('3')) {
            expCount++;
        }

        const state = (app.state || '').trim();
        if (state) {
            stateFreq[state] = (stateFreq[state] || 0) + 1;
        }
    });

    // 1. Channel Share Progress Bar & Legend
    const directPct = total > 0 ? Math.round((directCount / total) * 100) : 0;
    const hrPct = total > 0 ? Math.round((hrCount / total) * 100) : 0;

    const barDirect = document.getElementById('channelBarDirect');
    const barHr = document.getElementById('channelBarHr');
    const legendDirect = document.getElementById('legendDirectText');
    const legendHr = document.getElementById('legendHrText');
    const channelRatioBadge = document.getElementById('channelRatioBadge');

    if (barDirect) barDirect.style.width = `${directPct}%`;
    if (barHr) barHr.style.width = `${hrPct}%`;
    if (legendDirect) legendDirect.textContent = `${directCount} (${directPct}%)`;
    if (legendHr) legendHr.textContent = `${hrCount} (${hrPct}%)`;
    if (channelRatioBadge) channelRatioBadge.textContent = `${directPct}% Direct · ${hrPct}% HR`;

    // 2. Experience Share Progress Bar & Legend
    const expBase = fresherCount + expCount || total;
    const fresherPct = expBase > 0 ? Math.round((fresherCount / expBase) * 100) : 0;
    const expPct = expBase > 0 ? Math.round((expCount / expBase) * 100) : 0;

    const barFresher = document.getElementById('expBarFresher');
    const barExp = document.getElementById('expBarExp');
    const legendFresher = document.getElementById('legendFresherText');
    const legendExp = document.getElementById('legendExpText');
    const expRatioBadge = document.getElementById('expRatioBadge');

    if (barFresher) barFresher.style.width = `${fresherPct}%`;
    if (barExp) barExp.style.width = `${expPct}%`;
    if (legendFresher) legendFresher.textContent = `${fresherCount} (${fresherPct}%)`;
    if (legendExp) legendExp.textContent = `${expCount} (${expPct}%)`;
    if (expRatioBadge) expRatioBadge.textContent = `${fresherPct}% Freshers · ${expPct}% Exp`;

    // 3. Top HR Partners Leaderboard
    const leaderboardEl = document.getElementById('topHrLeaderboard');
    if (leaderboardEl) {
        const sortedHrs = Object.values(hrLeadsMap).sort((a, b) => b.count - a.count);
        if (sortedHrs.length === 0) {
            leaderboardEl.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.8rem; text-align: center; padding: 12px;">No HR recruiter partners registered yet.</div>`;
        } else {
            leaderboardEl.innerHTML = sortedHrs.slice(0, 5).map((item, idx) => {
                const hr = item.hr;
                const count = item.count;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
                const hrLink = buildHrLink(hr.code);

                return `
                    <div class="leaderboard-item">
                        <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
                            <span class="leaderboard-rank ${rankClass}">${idx + 1}</span>
                            <div style="min-width: 0;">
                                <div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${escapeHtml(hr.name)}</div>
                                <div style="font-size: 0.72rem; color: #93c5fd; font-family: monospace;">?hr=${escapeHtml(hr.code)}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-weight: 700; white-space: nowrap;">
                                ${count} (${pct}%)
                            </span>
                            <button type="button" class="btn-action" style="padding: 4px 7px; font-size: 0.72rem;" data-leadercopy="${escapeHtml(hr.code)}" title="Copy Referral Link">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(`Hi! Apply for the Elitex Media internship program here: ${hrLink}`)}" target="_blank" rel="noopener noreferrer" class="btn-action" style="padding: 4px 7px; font-size: 0.72rem;" title="WhatsApp Share">
                                <i class="fa-brands fa-whatsapp" style="color: #4ade80;"></i>
                            </a>
                            <button type="button" class="btn-action" style="padding: 4px 7px; font-size: 0.72rem;" data-leaderjump="${escapeHtml(hr.code)}" title="View Dedicated HR Section">
                                <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            leaderboardEl.querySelectorAll('[data-leadercopy]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const code = btn.getAttribute('data-leadercopy');
                    copyLink(code, btn);
                });
            });

            leaderboardEl.querySelectorAll('[data-leaderjump]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const code = btn.getAttribute('data-leaderjump');
                    switchToHrDashboard();
                    setTimeout(() => scrollToSection(`section_${code}`), 150);
                });
            });
        }
    }

    // 4. Top States Geographic Distribution Cloud
    const statesCloudEl = document.getElementById('topStatesCloud');
    if (statesCloudEl) {
        const sortedStates = Object.entries(stateFreq).sort((a, b) => b[1] - a[1]);
        if (sortedStates.length === 0) {
            statesCloudEl.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.8rem;">No location data submitted yet.</span>`;
        } else {
            statesCloudEl.innerHTML = sortedStates.slice(0, 10).map(([st, cnt]) => `
                <span class="state-pill" title="${cnt} applicant(s) from ${escapeHtml(st)}">
                    <i class="fa-solid fa-location-dot" style="font-size: 0.7rem; color: #60a5fa;"></i>
                    <span>${escapeHtml(st)}</span>
                    <strong>${cnt}</strong>
                </span>
            `).join('');
        }
    }

    populateFilterDropdowns(stateFreq);
}

function populateFilterDropdowns(stateFreq) {
    const sourceSelect = document.getElementById('masterSourceFilter');
    const stateSelect = document.getElementById('masterStateFilter');

    if (sourceSelect) {
        const currentVal = sourceSelect.value || 'all';
        let html = `
            <option value="all">All Channels (Direct & HR)</option>
            <option value="direct">Direct Website Only</option>
        `;
        hrPartnersCache.forEach(hr => {
            html += `<option value="${escapeHtml(hr.code.toLowerCase())}">HR: ${escapeHtml(hr.name)} (${escapeHtml(hr.code)})</option>`;
        });
        sourceSelect.innerHTML = html;
        if (currentVal && Array.from(sourceSelect.options).some(o => o.value === currentVal)) {
            sourceSelect.value = currentVal;
        }
    }

    if (stateSelect) {
        const currentVal = stateSelect.value || 'all';
        let html = `<option value="all">All States</option>`;
        const sortedStates = Object.keys(stateFreq).sort();
        sortedStates.forEach(st => {
            html += `<option value="${escapeHtml(st)}">${escapeHtml(st)} (${stateFreq[st]})</option>`;
        });
        stateSelect.innerHTML = html;
        if (currentVal && Array.from(stateSelect.options).some(o => o.value === currentVal)) {
            stateSelect.value = currentVal;
        }
    }
}

function renderMasterApplicationsTable() {
    const tbody = document.getElementById('masterApplicationsTableBody');
    const countEl = document.getElementById('masterTableCount');
    const searchVal = (document.getElementById('masterSearchInput') ? document.getElementById('masterSearchInput').value : '').toLowerCase().trim();
    const sourceFilter = document.getElementById('masterSourceFilter') ? document.getElementById('masterSourceFilter').value : 'all';
    const expFilter = document.getElementById('masterExpFilter') ? document.getElementById('masterExpFilter').value : 'all';
    const stateFilter = document.getElementById('masterStateFilter') ? document.getElementById('masterStateFilter').value : 'all';
    const sortFilter = document.getElementById('masterSortFilter') ? document.getElementById('masterSortFilter').value : 'newest';

    if (!tbody) return;

    let filtered = applicationsCache.filter(app => {
        if (!candidateMatchesSearch(app, searchVal)) return false;

        const ref = (app.referredBy || 'direct').trim().toLowerCase();
        if (sourceFilter === 'direct' && ref !== 'direct') return false;
        if (sourceFilter !== 'all' && sourceFilter !== 'direct' && ref !== sourceFilter) return false;

        const exp = (app.experience || '').toLowerCase();
        const isFresher = exp.includes('0') || exp.includes('fresher');
        if (expFilter === 'fresher' && !isFresher) return false;
        if (expFilter === 'experienced' && isFresher) return false;

        if (stateFilter !== 'all' && (app.state || '').trim() !== stateFilter) return false;

        return true;
    });

    filtered.sort((a, b) => {
        if (sortFilter === 'newest') {
            const timeA = a.timestamp ? (a.timestamp.seconds || 0) : 0;
            const timeB = b.timestamp ? (b.timestamp.seconds || 0) : 0;
            return timeB - timeA;
        } else if (sortFilter === 'oldest') {
            const timeA = a.timestamp ? (a.timestamp.seconds || 0) : 0;
            const timeB = b.timestamp ? (b.timestamp.seconds || 0) : 0;
            return timeA - timeB;
        } else if (sortFilter === 'name_asc') {
            const nameA = (a.firstName || a.name || '').toLowerCase();
            const nameB = (b.firstName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        } else if (sortFilter === 'marks_desc') {
            const mA = a.class12 != null ? a.class12 : -1;
            const mB = b.class12 != null ? b.class12 : -1;
            return mB - mA;
        }
        return 0;
    });

    if (countEl) {
        countEl.textContent = `Showing ${filtered.length} of ${applicationsCache.length} applications`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">${searchVal || sourceFilter !== 'all' || expFilter !== 'all' || stateFilter !== 'all' ? 'No applications match your selected filters.' : 'No applications received yet.'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(app => buildCandidateRowHtml(app, true)).join('');
}

function renderHomeDashboard() {
    renderAnalyticsWidgets();
    renderMasterApplicationsTable();
}

// ─── Export Applications to CSV Helper ──────────────────────────────────────
function exportApplicationsToCsv() {
    if (!applicationsCache || applicationsCache.length === 0) {
        alert("No application data available to export yet.");
        return;
    }

    const headers = [
        "Submission Date",
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "Phone",
        "Source Channel",
        "HR Partner Name",
        "State",
        "Gender",
        "Language",
        "Experience",
        "Class 10 Score",
        "Class 12 Score",
        "Skills",
        "Resume URL",
        "LinkedIn URL"
    ];

    const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = applicationsCache.map(app => {
        const dateStr = app.timestamp && app.timestamp.toDate
            ? app.timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : (app.createdAtLocal || '');
        const refCode = (app.referredBy || 'direct').trim().toLowerCase();
        let hrName = 'Direct Organic';
        if (refCode !== 'direct') {
            const hr = hrPartnersCache.find(h => h.code.toLowerCase() === refCode);
            hrName = hr ? hr.name : refCode.toUpperCase();
        }

        return [
            escapeCsv(dateStr),
            escapeCsv(app.firstName || ''),
            escapeCsv(app.lastName || ''),
            escapeCsv(app.firstName ? `${app.firstName} ${app.lastName || ''}`.trim() : (app.name || '')),
            escapeCsv(app.email || ''),
            escapeCsv(app.phone || app.rawPhone || ''),
            escapeCsv(refCode),
            escapeCsv(hrName),
            escapeCsv(app.state || ''),
            escapeCsv(app.gender || ''),
            escapeCsv(app.language || ''),
            escapeCsv(app.experience || ''),
            escapeCsv(app.class10 === true ? 'Completed' : (typeof app.class10 === 'number' ? `${app.class10}%` : 'Not completed')),
            escapeCsv(app.class12 === true ? 'Completed' : (typeof app.class12 === 'number' ? `${app.class12}%` : 'Not completed')),
            escapeCsv(app.skills || ''),
            escapeCsv(app.resume || app.portfolio || ''),
            escapeCsv(app.linkedin || '')
        ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `elitex_applications_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.exportApplicationsToCsv = exportApplicationsToCsv;

// ─── RENDER VIEW 2: DEDICATED HR NAVIGATION SECTION DECK ───────────────────
function renderNavigationDeck() {
    const deckContainer = document.getElementById('hrNavDeck');
    const pillsContainer = document.getElementById('sectionNavPills');
    if (!deckContainer) return;

    const { grouped, unmappedCodes } = getGroupedApplications();
    const totalApps = applicationsCache.length;
    const directCount = grouped.direct ? grouped.direct.length : 0;

    deckContainer.innerHTML = '';

    // Card 1: ALL APPLICATIONS OVERVIEW
    const allCard = document.createElement('div');
    allCard.className = `hr-nav-card ${activeSectionFilter === 'all' ? 'active-nav-card' : ''}`;
    allCard.innerHTML = `
        <div class="hr-nav-card-top">
            <div class="hr-nav-card-left">
                <div class="hr-nav-avatar all">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                <div class="hr-nav-info">
                    <h4>All Candidate Sections</h4>
                    <span class="hr-nav-slug">Full Directory</span>
                </div>
            </div>
            <span class="hr-nav-count" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.25);">
                ${totalApps} Total
            </span>
        </div>
        <div class="hr-nav-card-footer">
            <span style="font-size: 0.72rem; color: var(--text-secondary);">Direct & All HR Recruiters</span>
            <button type="button" class="hr-nav-action-btn ${activeSectionFilter === 'all' ? 'btn-jump' : ''}">
                <i class="fa-solid fa-list-check"></i> ${activeSectionFilter === 'all' ? 'Viewing All' : 'Show All'}
            </button>
        </div>
    `;
    allCard.addEventListener('click', () => {
        activeSectionFilter = 'all';
        renderNavigationDeck();
        renderAllSections();
    });
    deckContainer.appendChild(allCard);

    // Card 2: DIRECT WEBSITE SUBMISSIONS
    const directCard = document.createElement('div');
    directCard.className = `hr-nav-card ${activeSectionFilter === 'direct' ? 'active-nav-card' : ''}`;
    directCard.innerHTML = `
        <div class="hr-nav-card-top">
            <div class="hr-nav-card-left">
                <div class="hr-nav-avatar direct">
                    <i class="fa-solid fa-earth-americas"></i>
                </div>
                <div class="hr-nav-info">
                    <h4>Direct / Website</h4>
                    <span class="hr-nav-slug">Organic Link</span>
                </div>
            </div>
            <span class="hr-nav-count">${directCount} Fills</span>
        </div>
        <div class="hr-nav-card-footer">
            <span style="font-size: 0.72rem; color: var(--text-secondary);">No HR Referral Used</span>
            <button type="button" class="hr-nav-action-btn ${activeSectionFilter === 'direct' ? 'btn-jump' : ''}">
                <i class="fa-solid fa-arrow-right"></i> Open Section
            </button>
        </div>
    `;
    directCard.addEventListener('click', () => {
        activeSectionFilter = 'direct';
        renderNavigationDeck();
        renderAllSections();
        scrollToSection('section_direct');
    });
    deckContainer.appendChild(directCard);

    // Cards 3+: EACH REGISTERED HR PARTNER
    hrPartnersCache.forEach(hr => {
        const code = hr.code.toLowerCase();
        const fills = grouped[code] ? grouped[code].length : 0;
        const percentage = totalApps > 0 ? Math.round((fills / totalApps) * 100) : 0;
        const hrLink = buildHrLink(hr.code);
        const isActive = activeSectionFilter === code;

        const card = document.createElement('div');
        card.className = `hr-nav-card ${isActive ? 'active-nav-card' : ''}`;
        card.innerHTML = `
            <div class="hr-nav-card-top">
                <div class="hr-nav-card-left">
                    <div class="hr-nav-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <div class="hr-nav-info">
                        <h4>${escapeHtml(hr.name)}</h4>
                        <span class="hr-nav-slug">?hr=${escapeHtml(hr.code)}</span>
                    </div>
                </div>
                <span class="hr-nav-count" title="${fills} of ${totalApps} applications">${fills} Fills (${percentage}%)</span>
            </div>
            <div class="hr-nav-card-footer">
                <div style="display: flex; gap: 4px;">
                    <button type="button" class="hr-nav-action-btn" data-navcopy="${escapeHtml(hr.code)}" title="Copy ${escapeHtml(hr.name)}'s Referral Link">
                        <i class="fa-solid fa-copy"></i> Copy
                    </button>
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(`Hi! Apply for the Elitex Media internship program here: ${hrLink}`)}" target="_blank" rel="noopener noreferrer" class="hr-nav-action-btn" title="WhatsApp Invite">
                        <i class="fa-brands fa-whatsapp" style="color: #4ade80;"></i>
                    </a>
                </div>
                <button type="button" class="hr-nav-action-btn ${isActive ? 'btn-jump' : ''}">
                    <i class="fa-solid fa-arrow-right"></i> ${isActive ? 'Viewing' : 'Open Section'}
                </button>
            </div>
        `;

        const copyBtn = card.querySelector('[data-navcopy]');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyLink(hr.code, copyBtn);
            });
        }

        const waLink = card.querySelector('a');
        if (waLink) {
            waLink.addEventListener('click', (e) => e.stopPropagation());
        }

        card.addEventListener('click', () => {
            activeSectionFilter = code;
            renderNavigationDeck();
            renderAllSections();
            scrollToSection(`section_${code}`);
        });

        deckContainer.appendChild(card);
    });

    // Cards for Unmapped / Auto-detected codes
    unmappedCodes.forEach(code => {
        const fills = grouped[code] ? grouped[code].length : 0;
        const isActive = activeSectionFilter === code;

        const card = document.createElement('div');
        card.className = `hr-nav-card ${isActive ? 'active-nav-card' : ''}`;
        card.innerHTML = `
            <div class="hr-nav-card-top">
                <div class="hr-nav-card-left">
                    <div class="hr-nav-avatar" style="background: rgba(234, 179, 8, 0.12); color: #facc15; border-color: rgba(234, 179, 8, 0.25);">
                        <i class="fa-solid fa-tag"></i>
                    </div>
                    <div class="hr-nav-info">
                        <h4>${escapeHtml(code.toUpperCase())}</h4>
                        <span class="hr-nav-slug">Detected</span>
                    </div>
                </div>
                <span class="hr-nav-count">${fills} Fills</span>
            </div>
            <div class="hr-nav-card-footer">
                <button type="button" class="hr-nav-action-btn" style="color: #60a5fa;" data-navadopt="${escapeHtml(code)}">
                    <i class="fa-solid fa-plus"></i> Claim HR
                </button>
                <button type="button" class="hr-nav-action-btn ${isActive ? 'btn-jump' : ''}">
                    <i class="fa-solid fa-arrow-right"></i> Open
                </button>
            </div>
        `;

        const adoptBtn = card.querySelector('[data-navadopt]');
        if (adoptBtn) {
            adoptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = prompt(`Enter recruiter name for referral code "${code}":`, code.toUpperCase());
                if (name) saveHrPartner(name, code);
            });
        }

        card.addEventListener('click', () => {
            activeSectionFilter = code;
            renderNavigationDeck();
            renderAllSections();
            scrollToSection(`section_${code}`);
        });

        deckContainer.appendChild(card);
    });

    // 2. Render Sub-bar Quick Pills
    if (pillsContainer) {
        pillsContainer.innerHTML = '';

        const allPill = document.createElement('button');
        allPill.type = 'button';
        allPill.className = `nav-pill ${activeSectionFilter === 'all' ? 'active' : ''}`;
        allPill.innerHTML = `<span>All Sections</span> <span class="nav-pill-count">${totalApps}</span>`;
        allPill.addEventListener('click', () => {
            activeSectionFilter = 'all';
            renderNavigationDeck();
            renderAllSections();
        });
        pillsContainer.appendChild(allPill);

        const directPill = document.createElement('button');
        directPill.type = 'button';
        directPill.className = `nav-pill ${activeSectionFilter === 'direct' ? 'active' : ''}`;
        directPill.innerHTML = `<i class="fa-solid fa-earth-americas"></i> <span>Direct</span> <span class="nav-pill-count">${directCount}</span>`;
        directPill.addEventListener('click', () => {
            activeSectionFilter = 'direct';
            renderNavigationDeck();
            renderAllSections();
            scrollToSection('section_direct');
        });
        pillsContainer.appendChild(directPill);

        hrPartnersCache.forEach(hr => {
            const code = hr.code.toLowerCase();
            const cnt = grouped[code] ? grouped[code].length : 0;
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `nav-pill ${activeSectionFilter === code ? 'active' : ''}`;
            pill.innerHTML = `<i class="fa-solid fa-user-tie"></i> <span>${escapeHtml(hr.name)}</span> <span class="nav-pill-count">${cnt}</span>`;
            pill.addEventListener('click', () => {
                activeSectionFilter = code;
                renderNavigationDeck();
                renderAllSections();
                scrollToSection(`section_${code}`);
            });
            pillsContainer.appendChild(pill);
        });
    }
}

// ─── RENDER VIEW 2: DEDICATED SECTIONS PER HR ──────────────────────────────
function renderAllSections() {
    const container = document.getElementById('sectionsContainer');
    const searchQuery = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').toLowerCase().trim();

    if (!container) return;

    const { grouped, unmappedCodes } = getGroupedApplications();

    container.innerHTML = '';

    const shouldShow = (secCode) => {
        if (viewMode === 'stacked') return true;
        if (activeSectionFilter === 'all') return true;
        return activeSectionFilter === secCode;
    };

    // ─── A. DIRECT SUBMISSIONS SECTION ───
    if (shouldShow('direct')) {
        const directApps = grouped.direct || [];
        const filteredDirect = directApps.filter(app => candidateMatchesSearch(app, searchQuery));

        const directSec = document.createElement('div');
        directSec.className = 'hr-lead-section';
        directSec.id = 'section_direct';

        let rowsHtml = '';
        if (filteredDirect.length === 0) {
            rowsHtml = `<tr><td colspan="8" class="empty-section-state">${searchQuery ? 'No direct applications match your search query.' : 'No direct applications yet.'}</td></tr>`;
        } else {
            rowsHtml = filteredDirect.map(app => buildCandidateRowHtml(app, false)).join('');
        }

        directSec.innerHTML = `
            <div class="hr-lead-section-header">
                <div class="hr-lead-title-area">
                    <div class="hr-avatar direct-avatar">
                        <i class="fa-solid fa-earth-americas"></i>
                    </div>
                    <div class="hr-title-text">
                        <h3>
                            <span>Direct Website Submissions</span>
                            <span class="badge-count">${directApps.length} Candidate${directApps.length === 1 ? '' : 's'}</span>
                        </h3>
                        <p class="hr-section-desc">Applicants who visited and applied directly via website (organic, no HR link)</p>
                    </div>
                </div>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Candidate</th>
                            <th>Contact</th>
                            <th>State</th>
                            <th>Experience</th>
                            <th>Academics (10th / 12th)</th>
                            <th>Skills & Language</th>
                            <th>Portfolio & Links</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        container.appendChild(directSec);
    }

    // ─── B. DEDICATED SECTION FOR EACH HR PARTNER ───
    hrPartnersCache.forEach(hr => {
        const code = hr.code.toLowerCase();
        if (!shouldShow(code)) return;

        const hrApps = grouped[code] || [];
        const filteredHrApps = hrApps.filter(app => candidateMatchesSearch(app, searchQuery));
        const hrLink = buildHrLink(hr.code);

        const hrSec = document.createElement('div');
        hrSec.className = 'hr-lead-section';
        hrSec.id = `section_${code}`;

        let rowsHtml = '';
        if (filteredHrApps.length === 0) {
            if (searchQuery) {
                rowsHtml = `<tr><td colspan="8" class="empty-section-state">No candidates in ${escapeHtml(hr.name)}'s network match your search.</td></tr>`;
            } else {
                rowsHtml = `
                    <tr>
                        <td colspan="8" class="empty-section-state" style="padding: 44px 20px;">
                            <i class="fa-solid fa-user-clock" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.5;"></i>
                            <p style="font-weight: 600; color: #fff; margin-bottom: 4px;">No applications through ${escapeHtml(hr.name)}'s link yet</p>
                            <p style="font-size: 0.8rem;">Share the link above with ${escapeHtml(hr.name)}'s network. All their submissions will appear here!</p>
                        </td>
                    </tr>
                `;
            }
        } else {
            rowsHtml = filteredHrApps.map(app => buildCandidateRowHtml(app, false)).join('');
        }

        hrSec.innerHTML = `
            <div class="hr-lead-section-header">
                <div class="hr-lead-title-area">
                    <div class="hr-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <div class="hr-title-text">
                        <h3>
                            <span>${escapeHtml(hr.name)}'s Network</span>
                            <span class="hr-pill-code">?hr=${escapeHtml(hr.code)}</span>
                            <span class="badge-count">${hrApps.length} Form${hrApps.length === 1 ? '' : 's'} Filled</span>
                        </h3>
                        <p class="hr-section-desc">Candidates who submitted through ${escapeHtml(hr.name)}'s dedicated tracking link</p>
                    </div>
                </div>

                <div class="hr-lead-tools">
                    <div class="hr-link-bar">
                        <i class="fa-solid fa-link" style="color: var(--text-secondary); font-size: 0.72rem;"></i>
                        <input type="text" readonly value="${escapeHtml(hrLink)}" title="Custom Link for ${escapeHtml(hr.name)}">
                        <button type="button" class="btn-action btn-copy" data-copycode="${escapeHtml(hr.code)}" title="Copy Link">
                            <i class="fa-solid fa-copy"></i> Copy
                        </button>
                    </div>

                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(`Hi! Apply for the Elitex Media internship program here: ${hrLink}`)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp" title="Share via WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </a>

                    <button type="button" class="btn-action btn-delete" data-delid="${escapeHtml(hr.id || '')}" data-delcode="${escapeHtml(hr.code)}" title="Delete this HR Section">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Candidate</th>
                            <th>Contact</th>
                            <th>State</th>
                            <th>Experience</th>
                            <th>Academics (10th / 12th)</th>
                            <th>Skills & Language</th>
                            <th>Portfolio & Links</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        const copyBtn = hrSec.querySelector('[data-copycode]');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyLink(hr.code, copyBtn));
        }

        const deleteBtn = hrSec.querySelector('[data-delcode]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteHrPartner(hr.id, hr.code));
        }

        container.appendChild(hrSec);
    });

    // ─── C. SECTIONS FOR UNMAPPED / DETECTED CODES ───
    unmappedCodes.forEach(code => {
        if (!shouldShow(code)) return;

        const apps = grouped[code] || [];
        const filteredApps = apps.filter(app => candidateMatchesSearch(app, searchQuery));
        const hrLink = buildHrLink(code);

        const sec = document.createElement('div');
        sec.className = 'hr-lead-section';
        sec.id = `section_${code}`;

        let rowsHtml = filteredApps.length === 0
            ? `<tr><td colspan="8" class="empty-section-state">No matching applications in this section.</td></tr>`
            : filteredApps.map(app => buildCandidateRowHtml(app, false)).join('');

        sec.innerHTML = `
            <div class="hr-lead-section-header">
                <div class="hr-lead-title-area">
                    <div class="hr-avatar" style="background: rgba(234, 179, 8, 0.12); color: #facc15; border-color: rgba(234, 179, 8, 0.25);">
                        <i class="fa-solid fa-tag"></i>
                    </div>
                    <div class="hr-title-text">
                        <h3>
                            <span>Referral Code: ${escapeHtml(code.toUpperCase())}</span>
                            <span class="hr-pill-code">?hr=${escapeHtml(code)}</span>
                            <span class="badge-count">${apps.length} Candidate${apps.length === 1 ? '' : 's'}</span>
                        </h3>
                        <p class="hr-section-desc">Auto-detected referral submissions for code "${escapeHtml(code)}"</p>
                    </div>
                </div>

                <div class="hr-lead-tools">
                    <button type="button" class="btn-action" style="background: #3b82f6; color: #fff; border: none;" data-claimcode="${escapeHtml(code)}">
                        <i class="fa-solid fa-user-plus"></i> Name HR Recruiter
                    </button>
                    <button type="button" class="btn-action btn-copy" data-copycode="${escapeHtml(code)}">
                        <i class="fa-solid fa-copy"></i> Copy Link
                    </button>
                </div>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Candidate</th>
                            <th>Contact</th>
                            <th>State</th>
                            <th>Experience</th>
                            <th>Academics (10th / 12th)</th>
                            <th>Skills & Language</th>
                            <th>Portfolio & Links</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        const copyBtn = sec.querySelector('[data-copycode]');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyLink(code, copyBtn));
        }

        const claimBtn = sec.querySelector('[data-claimcode]');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                const name = prompt(`Enter recruiter name for code "${code}":`, code.toUpperCase());
                if (name) saveHrPartner(name, code);
            });
        }

        container.appendChild(sec);
    });
}

function scrollToSection(id) {
    setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            el.classList.add('highlighted');
            setTimeout(() => el.classList.remove('highlighted'), 2000);
        }
    }, 50);
}

// ─── Update Metrics for Both Views ──────────────────────────────────────────
function updateStats() {
    const total = applicationsCache.length;
    let hrLeads = 0;
    let directLeads = 0;
    let freshers = 0;
    let experienced = 0;
    let sum10 = 0, count10 = 0;
    let sum12 = 0, count12 = 0;

    applicationsCache.forEach(app => {
        const ref = (app.referredBy || 'direct').trim().toLowerCase();
        if (ref === 'direct') {
            directLeads++;
        } else {
            hrLeads++;
        }

        const exp = (app.experience || '').toLowerCase();
        if (exp.includes('0') || exp.includes('fresher')) {
            freshers++;
        } else if (exp.includes('1') || exp.includes('2') || exp.includes('3')) {
            experienced++;
        }

        if (app.class10 === true) count10++;
        else if (typeof app.class10 === 'number') {
            sum10 += app.class10;
            count10++;
        }
        if (app.class12 === true) count12++;
        else if (typeof app.class12 === 'number') {
            sum12 += app.class12;
            count12++;
        }
    });

    const avg10 = count10 > 0 && sum10 === 0 ? `${count10} completed` : (count10 > 0 ? (sum10 / count10).toFixed(1) + '%' : '—');
    const avg12 = count12 > 0 && sum12 === 0 ? `${count12} completed` : (count12 > 0 ? (sum12 / count12).toFixed(1) + '%' : '—');

    // Master Dashboard KPI Stats
    const mTotal = document.getElementById('masterStatTotal');
    const mDirect = document.getElementById('masterStatDirect');
    const mHrLeads = document.getElementById('masterStatHrLeads');
    const mHrCount = document.getElementById('masterStatHrCount');
    const mFreshers = document.getElementById('masterStatFreshers');
    const mExp = document.getElementById('masterStatExperienced');
    const mAvg10 = document.getElementById('masterStatAvg10');
    const mAvg12 = document.getElementById('masterStatAvg12');

    if (mTotal) mTotal.textContent = total;
    if (mDirect) mDirect.textContent = directLeads;
    if (mHrLeads) mHrLeads.textContent = hrLeads;
    if (mHrCount) mHrCount.textContent = hrPartnersCache.length;
    if (mFreshers) mFreshers.textContent = freshers;
    if (mExp) mExp.textContent = experienced;
    if (mAvg10) mAvg10.textContent = avg10;
    if (mAvg12) mAvg12.textContent = avg12;

    // HR Dashboard Stats
    const hrTotal = document.getElementById('hrStatTotal');
    const hrCount = document.getElementById('hrStatCount');
    const hrDirect = document.getElementById('hrStatDirect');
    const hrGrand = document.getElementById('hrStatGrandTotal');

    if (hrTotal) hrTotal.textContent = hrLeads;
    if (hrCount) hrCount.textContent = hrPartnersCache.length;
    if (hrDirect) hrDirect.textContent = directLeads;
    if (hrGrand) hrGrand.textContent = total;

    // Badges across Header and Sidebar
    const navHomeBadge = document.getElementById('navHomeBadge');
    const navHrBadge = document.getElementById('navHrBadge');
    const sideHomeBadge = document.getElementById('sideHomeBadge');
    const sideTotalBadge = document.getElementById('sideTotalBadge');
    const sideHrBadge = document.getElementById('sideHrBadge');
    const sideFooterTotal = document.getElementById('sideFooterTotal');
    const sideFooterHr = document.getElementById('sideFooterHr');

    if (navHomeBadge) navHomeBadge.textContent = total;
    if (navHrBadge) navHrBadge.textContent = hrPartnersCache.length;
    if (sideHomeBadge) sideHomeBadge.textContent = total;
    if (sideTotalBadge) sideTotalBadge.textContent = total;
    if (sideHrBadge) sideHrBadge.textContent = hrPartnersCache.length;
    if (sideFooterTotal) sideFooterTotal.textContent = total;
    if (sideFooterHr) sideFooterHr.textContent = hrPartnersCache.length;
}

// ─── Fetch Applications ─────────────────────────────────────────────────────
async function fetchApplications() {
    try {
        const querySnapshot = await db.collection("applications")
            .orderBy("timestamp", "desc")
            .get();

        applicationsCache = [];
        querySnapshot.forEach(doc => {
            applicationsCache.push({ id: doc.id, ...doc.data() });
        });

        updateStats();

        if (currentAdminView === 'hr') {
            renderNavigationDeck();
            renderAllSections();
        } else {
            renderHomeDashboard();
        }

    } catch (err) {
        console.error('Error fetching applications:', err);
    }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

// 3-Line Hamburger Menu Button on Left Side
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openSidebar);
}
if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeSidebar);
}
if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
}

// Close drawer on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});

// Sidebar & Top Nav Navigation buttons
const sideBtnHome = document.getElementById('sideBtnHome');
const sideBtnDashboard = document.getElementById('sideBtnDashboard');
const sideBtnHr = document.getElementById('sideBtnHr');
const navItemHome = document.getElementById('navItemHome');
const navItemDashboard = document.getElementById('navItemDashboard');
const navItemHr = document.getElementById('navItemHr');

if (sideBtnHome) {
    sideBtnHome.addEventListener('click', () => switchView('dashboard'));
}
if (sideBtnDashboard) {
    sideBtnDashboard.addEventListener('click', () => switchView('dashboard'));
}
if (sideBtnHr) {
    sideBtnHr.addEventListener('click', () => switchView('hr'));
}
if (navItemHome) {
    navItemHome.addEventListener('click', () => switchView('dashboard'));
}
if (navItemDashboard) {
    navItemDashboard.addEventListener('click', () => switchView('dashboard'));
}
if (navItemHr) {
    navItemHr.addEventListener('click', () => switchView('hr'));
}

// Multi-Filter controls in Master Dashboard
const masterSourceFilter = document.getElementById('masterSourceFilter');
const masterExpFilter = document.getElementById('masterExpFilter');
const masterStateFilter = document.getElementById('masterStateFilter');
const masterSortFilter = document.getElementById('masterSortFilter');

if (masterSourceFilter) {
    masterSourceFilter.addEventListener('change', renderMasterApplicationsTable);
}
if (masterExpFilter) {
    masterExpFilter.addEventListener('change', renderMasterApplicationsTable);
}
if (masterStateFilter) {
    masterStateFilter.addEventListener('change', renderMasterApplicationsTable);
}
if (masterSortFilter) {
    masterSortFilter.addEventListener('change', renderMasterApplicationsTable);
}

// View mode toggles in HR Dashboard
const modeTabsBtn = document.getElementById('modeTabsBtn');
const modeStackedBtn = document.getElementById('modeStackedBtn');

if (modeTabsBtn && modeStackedBtn) {
    modeTabsBtn.addEventListener('click', () => {
        viewMode = 'tabs';
        modeTabsBtn.classList.add('active');
        modeStackedBtn.classList.remove('active');
        renderNavigationDeck();
        renderAllSections();
    });

    modeStackedBtn.addEventListener('click', () => {
        viewMode = 'stacked';
        modeStackedBtn.classList.add('active');
        modeTabsBtn.classList.remove('active');
        renderNavigationDeck();
        renderAllSections();
    });
}

// Auto slug generation on name input
const hrNameInput = document.getElementById('hrNameInput');
const hrCodeInput = document.getElementById('hrCodeInput');
const slugPreview = document.getElementById('slugPreview');

if (hrNameInput && hrCodeInput) {
    hrNameInput.addEventListener('input', () => {
        if (!isSlugManuallyEdited) {
            const clean = hrNameInput.value
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9_-]/g, '');
            hrCodeInput.value = clean;
            if (slugPreview) slugPreview.textContent = clean || 'code';
        }
    });

    hrCodeInput.addEventListener('input', () => {
        isSlugManuallyEdited = Boolean(hrCodeInput.value.trim());
        const clean = hrCodeInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (slugPreview) slugPreview.textContent = clean || 'code';
    });
}

// Custom domain input handling
const baseDomainInput = document.getElementById('baseDomainInput');
if (baseDomainInput) {
    baseDomainInput.value = localStorage.getItem('elitex_custom_domain') || getBaseUrl();
    baseDomainInput.addEventListener('change', () => {
        const val = baseDomainInput.value.trim();
        if (val) {
            localStorage.setItem('elitex_custom_domain', val);
        } else {
            localStorage.removeItem('elitex_custom_domain');
            baseDomainInput.value = getBaseUrl();
        }
        renderNavigationDeck();
        renderAllSections();
    });
}

// Add HR Partner form submit
const addHrForm = document.getElementById('addHrForm');
if (addHrForm) {
    addHrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = hrNameInput.value.trim();
        const code = hrCodeInput.value.trim();
        if (!name || !code) return;

        const saveBtn = document.getElementById('saveHrBtn');
        const orig = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Adding...';
        saveBtn.disabled = true;

        try {
            await saveHrPartner(name, code);
            addHrForm.reset();
            isSlugManuallyEdited = false;
            if (slugPreview) slugPreview.textContent = 'code';
            if (baseDomainInput) baseDomainInput.value = localStorage.getItem('elitex_custom_domain') || getBaseUrl();
        } finally {
            saveBtn.innerHTML = orig;
            saveBtn.disabled = false;
        }
    });
}

// Search inputs
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        renderAllSections();
    });
}

const masterSearchInput = document.getElementById('masterSearchInput');
if (masterSearchInput) {
    masterSearchInput.addEventListener('input', () => {
        renderMasterApplicationsTable();
    });
}

// HR Database filters
['hrDbSearch','hrDbFilterHr','hrDbFilterExp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === 'hrDbSearch' ? 'input' : 'change', renderHrDatabase);
});

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i> Refreshing...';
    btn.disabled = true;

    try {
        await fetchHrPartners();
        await fetchApplications();
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh';
        btn.disabled = false;
    }
});

// Boot up
(async function init() {
    await fetchHrPartners();
    await fetchApplications();

    // Check URL hash to open HR Dashboard directly if requested
    if (window.location.hash === '#hr-dashboard') {
        switchView('hr');
    } else {
        switchView('home');
    }
})();
