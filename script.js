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

// Enable animations once JS is running
document.body.classList.add('js-loaded');

// ─── HR Referral Tracking ───────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const hrUrlParam = (urlParams.get('hr') || urlParams.get('ref') || '').trim().toLowerCase();

if (hrUrlParam) {
    try {
        sessionStorage.setItem('elitex_hr_ref', hrUrlParam);
        localStorage.setItem('elitex_hr_ref', hrUrlParam);
    } catch (e) {}
}

const activeHrRef = (function() {
    try {
        return sessionStorage.getItem('elitex_hr_ref') || localStorage.getItem('elitex_hr_ref') || hrUrlParam;
    } catch (e) {
        return hrUrlParam;
    }
})();

if (activeHrRef && activeHrRef !== 'direct') {
    const hrBadge = document.getElementById('hrBadge');
    const hrBadgeName = document.getElementById('hrBadgeName');
    if (hrBadge && hrBadgeName) {
        hrBadgeName.textContent = activeHrRef.toUpperCase();
        hrBadge.classList.remove('hidden');
    }
}

// ─── Scroll-driven fade-up animations ───────────────────────────────────────
// rootMargin "0px 0px -50px 0px" triggers slightly before element is fully
// in view → feels snappier / no pop-in at the last moment.
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target); // fire once only
        }
    });
}, { rootMargin: '0px 0px -50px 0px', threshold: 0 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ─── Form submission ─────────────────────────────────────────────────────────
document.getElementById('applicationForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const firstName  = document.getElementById('firstName').value.trim();
    const lastName   = document.getElementById('lastName').value.trim();
    const fullName   = `${firstName} ${lastName}`.trim();
    const email      = document.getElementById('email').value.trim();
    const phoneInput = document.getElementById('phone').value.trim();
    const phone      = phoneInput ? `+91 ${phoneInput}` : '';
    const state      = document.getElementById('state').value;
    const gender     = document.getElementById('gender').value;
    const language   = document.getElementById('language').value;
    const experience = document.getElementById('experience').value;
    const resume     = document.getElementById('resume').value.trim();
    const linkedin   = document.getElementById('linkedin').value.trim();
    const skills     = document.getElementById('skills').value.trim();
    const class10    = document.getElementById('class10').value.trim();
    const class12    = document.getElementById('class12').value.trim();

    // Determine HR referral source
    let referredBy = 'direct';
    try {
        referredBy = sessionStorage.getItem('elitex_hr_ref') || localStorage.getItem('elitex_hr_ref') || hrUrlParam || 'direct';
    } catch (e) {
        referredBy = hrUrlParam || 'direct';
    }
    referredBy = (referredBy || 'direct').trim().toLowerCase();

    const submitBtn = document.querySelector('.submit-btn');
    const msgEl     = document.getElementById('form-message');

    // Loading state
    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Submitting Application...</span>';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    try {
        await db.collection('applications').add({
            firstName,
            lastName,
            name: fullName, // composite name for legacy queries
            email,
            phone,
            rawPhone: phoneInput,
            state,
            gender,
            language,
            experience,
            resume,
            portfolio: resume, // legacy fallback
            linkedin: linkedin || '',
            skills,
            class10: class10 ? parseFloat(class10) : null,
            class12: class12 ? parseFloat(class12) : null,
            referredBy: referredBy,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        msgEl.textContent = `Thanks, ${firstName}! We've received your application. Our team will review it shortly.`;
        msgEl.style.color = '#fff';
        msgEl.classList.remove('hidden');
        this.reset();

    } catch (err) {
        console.error('Submission Error:', err);
        msgEl.textContent = err.message || 'Something went wrong. Please try again.';
        msgEl.style.color = '#ff6b6b';
        msgEl.classList.remove('hidden');

    } finally {
        submitBtn.innerHTML = original;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;

        setTimeout(() => msgEl.classList.add('hidden'), 7000);
    }
});
