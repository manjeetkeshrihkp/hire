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
const auth = firebase.auth();
const verifiedEmailKey = 'elitex_verified_email';
const pendingEmailKey = 'elitex_pending_email';
const pendingApplicationKey = 'elitex_pending_application';

// Enable animations once JS is running
document.body.classList.add('js-loaded');

const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target); // fire once only
        }
    });
}, { rootMargin: '0px 0px -50px 0px', threshold: 0 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

if (new URLSearchParams(window.location.search).get('agent') === '1') {
    const applicationForm = document.getElementById('applicationForm');
    const submitButton = applicationForm && applicationForm.querySelector('.submit-btn');
    if (applicationForm && submitButton && !document.getElementById('referralCode')) {
        const referralGroup = document.createElement('div');
        referralGroup.className = 'form-group';
        referralGroup.innerHTML = '<label for="referralCode">Referral Code <span class="optional">(Optional)</span></label>' +
            '<input type="text" id="referralCode" placeholder="Enter referral code" autocomplete="off" inputmode="text">';
        applicationForm.insertBefore(referralGroup, submitButton);
    }
}

const successModal = document.getElementById('successModal');
const successModalTitle = document.getElementById('successModalTitle');
const successModalMessage = document.getElementById('successModalMessage');
const showSuccessModal = (title, message) => {
    successModalTitle.textContent = title;
    successModalMessage.textContent = message;
    successModal.classList.remove('hidden');
};
const closeSuccessModal = () => successModal.classList.add('hidden');
document.getElementById('closeSuccessModal').addEventListener('click', closeSuccessModal);
document.getElementById('successModalDone').addEventListener('click', closeSuccessModal);

document.getElementById('googleSignIn').addEventListener('click', async function() {
    const emailInput = document.getElementById('email');
    const msgEl = document.getElementById('form-message');
    const originalText = this.innerHTML;
    this.disabled = true;
    this.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting...';

    try {
        const result = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        const email = (result.user.email || '').toLowerCase();
        if (!email.endsWith('@gmail.com')) {
            await auth.signOut();
            throw new Error('Please use a personal Gmail account ending in @gmail.com.');
        }
        emailInput.value = email;
        const emailDisplay = document.getElementById('emailDisplay');
        emailDisplay.textContent = email;
        emailDisplay.classList.remove('hidden');
        this.classList.add('hidden');
        localStorage.setItem(verifiedEmailKey, email);
        msgEl.textContent = 'Gmail verified. You can now submit your application.';
        msgEl.style.color = '#fff';
        msgEl.classList.remove('hidden');
    } catch (err) {
        msgEl.textContent = err.message || 'Google sign-in was cancelled or could not be completed.';
        msgEl.style.color = '#ff6b6b';
        msgEl.classList.remove('hidden');
    } finally {
        this.disabled = false;
        this.innerHTML = originalText;
    }
});
const formFieldIds = ['firstName', 'lastName', 'email', 'phone', 'state', 'gender', 'language', 'experience', 'currentStatus', 'skills', 'class10', 'class12', 'policyConsent'];
const savePendingApplication = () => {
    const values = {};
    formFieldIds.forEach(id => {
        const field = document.getElementById(id);
        values[id] = field.type === 'checkbox' ? field.checked : field.value;
    });
    localStorage.setItem(pendingApplicationKey, JSON.stringify(values));
};
const restorePendingApplication = () => {
    const saved = JSON.parse(localStorage.getItem(pendingApplicationKey) || 'null');
    if (!saved) return;
    formFieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field.type === 'checkbox') field.checked = Boolean(saved[id]);
        else if (saved[id] !== undefined) field.value = saved[id];
    });
    localStorage.removeItem(pendingApplicationKey);
};
if (auth.isSignInWithEmailLink(window.location.href)) {
    const pendingEmail = localStorage.getItem(pendingEmailKey);
    if (pendingEmail) {
        auth.signInWithEmailLink(pendingEmail, window.location.href)
            .then(() => {
                localStorage.setItem(verifiedEmailKey, pendingEmail.toLowerCase());
                localStorage.removeItem(pendingEmailKey);
                restorePendingApplication();
                window.history.replaceState({}, document.title, window.location.pathname);
                showSuccessModal('Email verified', 'Your Gmail address is verified. Click Done, then submit your application.');
            })
            .catch(() => showSuccessModal('Verification failed', 'This verification link is invalid or expired. Please submit your email again.'));
    }
}
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
    const currentStatus = document.getElementById('currentStatus').value;
    const skills     = document.getElementById('skills').value.trim();
    const referralCodeField = document.getElementById('referralCode');
    const referralCode = referralCodeField ? referralCodeField.value.trim() : '';
    const class10    = document.getElementById('class10').checked;
    const class12    = document.getElementById('class12').checked;
    const submitBtn  = document.querySelector('.submit-btn');
    const msgEl      = document.getElementById('form-message');

    try {
        if (localStorage.getItem('elitex_application_submitted_email') === email.toLowerCase()) {
            showSuccessModal('Already submitted', 'You have already submitted an application. Our team will connect with you within 24 hours.');
            return;
        }
    } catch (e) {
        // Continue normally when browser storage is unavailable.
    }

    if (!email || localStorage.getItem(verifiedEmailKey) !== email.toLowerCase()) {
        msgEl.textContent = 'Please use Fetch with Google to add and verify your Gmail address.';
        msgEl.style.color = '#ff6b6b';
        msgEl.classList.remove('hidden');
        return;
    }

    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Submitting Application...</span>';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    try {
        await db.collection('applications').add({
            firstName,
            lastName,
            name: fullName, 
            email,
            phone,
            rawPhone: phoneInput,
            state,
            gender,
            language,
            experience,
            currentStatus,
            skills,
            referralCode,
            class10,
            class12,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        msgEl.textContent = `Thanks, ${firstName}! We've received your application. Our team will review it shortly.`;
        msgEl.style.color = '#fff';
        msgEl.classList.remove('hidden');
        showSuccessModal('Application submitted', `Thank you, ${firstName}. Our team will connect with you within 24 hours.`);
        try {
            localStorage.setItem('elitex_application_submitted_email', email.toLowerCase());
            localStorage.removeItem(verifiedEmailKey);
        } catch (e) {
           
        }
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


