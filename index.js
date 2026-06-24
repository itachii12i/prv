// ===========================================
// LODEALODE.DZ - MAIN SCRIPT (CLEAN VERSION)
// ===========================================

const supabaseClient = window.LodeaAuth?.getSupabaseClient?.() || null;
if (!supabaseClient) console.error('Supabase client not loaded!');

const SUPER_ADMIN_EMAILS = ['ahmedmalekmohamedelamine@gmail.com'];

// --- GLOBAL STATE ---
let isLoginMode = true;
let indexAuthUser = null;
let productsCache = [];

// --- DOM ELEMENT REFERENCES (set in initializeAuthElements) ---
let loginBtn, logoutBtn, userInfo, userEmailSpan;
let adminPanelBtn, superAdminPanelBtn, mobileOrdersBtn;
let authModal, closeModalBtn, authForm, authTitle, authSubmitBtn, btnText, btnSpinner;
let authSwitchLink, authSwitchMsg, authError, authSuccess;
let ordersModal, ordersList, ordersLoading, ordersEmpty, closeOrdersBtn, myOrdersBtn;
let mobileAccountModal, closeMobileAccountBtn, mobileLogoutBtn;

function initializeAuthElements() {
    loginBtn          = document.getElementById('login-btn');
    logoutBtn         = document.getElementById('logout-btn');
    userInfo          = document.getElementById('user-info');
    userEmailSpan     = document.getElementById('user-email');
    adminPanelBtn     = document.getElementById('admin-panel-btn');
    superAdminPanelBtn= document.getElementById('super-admin-panel-btn');
    mobileOrdersBtn   = document.getElementById('mobile-orders-btn');

    authModal         = document.getElementById('auth-modal');
    closeModalBtn     = document.getElementById('close-modal-btn');
    authForm          = document.getElementById('auth-form');
    authTitle         = document.getElementById('auth-title');
    authSubmitBtn     = document.getElementById('auth-submit-btn');
    if (authSubmitBtn) {
        btnText    = authSubmitBtn.querySelector('.btn-text');
        btnSpinner = authSubmitBtn.querySelector('.btn-spinner');
    }
    authSwitchLink    = document.getElementById('auth-switch-link');
    authSwitchMsg     = document.getElementById('auth-switch-msg');
    authError         = document.getElementById('auth-error');
    authSuccess       = document.getElementById('auth-success');

    ordersModal       = document.getElementById('orders-modal');
    ordersList        = document.getElementById('orders-list');
    ordersLoading     = document.getElementById('orders-loading');
    ordersEmpty       = document.getElementById('orders-empty');
    closeOrdersBtn    = document.getElementById('close-orders-btn');
    myOrdersBtn       = document.getElementById('my-orders-btn');

    mobileAccountModal    = document.getElementById('mobile-account-modal');
    closeMobileAccountBtn = document.getElementById('close-mobile-account-btn');
    mobileLogoutBtn       = document.getElementById('mobile-logout-btn');
}

// --- AUTH HELPERS ---
function resetAuthForm() {
    if (authForm) authForm.reset();
    resetMessages();
    isLoginMode = true;
    if (authTitle)      authTitle.textContent      = 'تسجيل الدخول';
    if (btnText)        btnText.textContent         = 'تسجيل الدخول';
    if (authSwitchMsg)  authSwitchMsg.textContent   = 'ليس لديك حساب؟';
    if (authSwitchLink) authSwitchLink.textContent  = 'أنشئ حساباً الآن';
}

function resetMessages() {
    if (authError)   { authError.textContent = '';   authError.classList.add('hidden'); }
    if (authSuccess) { authSuccess.textContent = ''; authSuccess.classList.add('hidden'); }
}

function setLoading(loading) {
    if (!authSubmitBtn || !btnText || !btnSpinner) return;
    authSubmitBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnSpinner.classList.toggle('hidden', !loading);
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

function showError(msg) {
    if (authError) { authError.textContent = msg; authError.classList.remove('hidden'); }
    showToast(msg, 'error');
}

function showSuccess(msg) {
    if (authSuccess) { authSuccess.textContent = msg; authSuccess.classList.remove('hidden'); }
    showToast(msg, 'success');
}

// --- UPDATE UI AFTER LOGIN/LOGOUT ---
async function updateUIForUser(user) {
    // Grab all relevant elements fresh each call (works on any page)
    const homeLoginBtn      = document.getElementById('home-login-btn');
    const homeAccountPill   = document.getElementById('home-account-pill');
    const homeAccountAvatar = document.getElementById('home-account-avatar');
    const homeAccountName   = document.getElementById('home-account-name');
    const homeGreeting      = document.getElementById('home-greeting');
    const mobileUserEmail   = document.getElementById('mobile-user-email');
    const mobileAdminBtn    = document.getElementById('mobile-admin-btn');
    const mobileSuperAdminBtn = document.getElementById('mobile-super-admin-btn');
    const productLoginBtn   = document.getElementById('product-login-btn');
    const productUserDropdown = document.getElementById('product-nav-user');
    const productNavEmail   = document.getElementById('product-nav-email');
    const productLogoutBtn  = document.getElementById('product-logout-btn');

    if (user) {
        const name = user.email.split('@')[0];

        // Home header
        if (homeGreeting)      homeGreeting.textContent = `مرحباً بك، ${name}`;
        if (homeLoginBtn)      homeLoginBtn.classList.add('hidden');
        if (homeAccountPill) {
            homeAccountPill.classList.add('visible');
            if (homeAccountName)   homeAccountName.textContent = name;
            if (homeAccountAvatar) homeAccountAvatar.textContent = name.charAt(0).toUpperCase();
        }

        // Main navbar
        if (loginBtn)      loginBtn.classList.add('hidden');
        if (userInfo)      userInfo.classList.remove('hidden');
        if (userEmailSpan) { userEmailSpan.textContent = user.email; userEmailSpan.title = user.email; }

        // Product page navbar
        if (productLoginBtn)    productLoginBtn.classList.add('hidden');
        if (productUserDropdown) productUserDropdown.classList.remove('hidden');
        if (productNavEmail)    productNavEmail.textContent = user.email;

        // Mobile
        if (mobileUserEmail) mobileUserEmail.textContent = user.email;

        // Admin access
        const isSuperAdmin = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.trim().toLowerCase());
        if (superAdminPanelBtn)  { superAdminPanelBtn.classList.toggle('hidden', !isSuperAdmin); }
        if (mobileSuperAdminBtn) { mobileSuperAdminBtn.classList.toggle('hidden', !isSuperAdmin); }

        if (adminPanelBtn || mobileAdminBtn) {
            if (isSuperAdmin) {
                if (adminPanelBtn)  adminPanelBtn.classList.remove('hidden');
                if (mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
            } else if (supabaseClient) {
                try {
                    const { data } = await supabaseClient.from('admins').select('email').eq('email', user.email.trim().toLowerCase());
                    const isAdmin = data && data.length > 0;
                    if (adminPanelBtn)  adminPanelBtn.classList.toggle('hidden', !isAdmin);
                    if (mobileAdminBtn) mobileAdminBtn.classList.toggle('hidden', !isAdmin);
                } catch {
                    if (adminPanelBtn)  adminPanelBtn.classList.add('hidden');
                    if (mobileAdminBtn) mobileAdminBtn.classList.add('hidden');
                }
            }
        }

        // Gamification & AI
        if (typeof window.checkStreakAndRewards === 'function') window.checkStreakAndRewards(user.email);
        if (typeof window.renderAIPicks === 'function') window.renderAIPicks();

        // Product page logout
        if (productLogoutBtn && !productLogoutBtn._bound) {
            productLogoutBtn._bound = true;
            productLogoutBtn.addEventListener('click', async () => {
                if (window.LodeaAuth?.signOut) await window.LodeaAuth.signOut();
                else if (supabaseClient) await supabaseClient.auth.signOut();
                indexAuthUser = null;
                await updateUIForUser(null);
            });
        }

    } else {
        // Reset everything
        if (homeLoginBtn)      homeLoginBtn.classList.remove('hidden');
        if (homeAccountPill)   homeAccountPill.classList.remove('visible');
        if (homeGreeting)      homeGreeting.textContent = 'مرحباً بك';
        if (loginBtn)          loginBtn.classList.remove('hidden');
        if (userInfo)          userInfo.classList.add('hidden');
        if (userEmailSpan)     userEmailSpan.textContent = '';
        if (mobileUserEmail)   mobileUserEmail.textContent = '';
        if (adminPanelBtn)     adminPanelBtn.classList.add('hidden');
        if (superAdminPanelBtn) superAdminPanelBtn.classList.add('hidden');
        if (mobileAdminBtn)    mobileAdminBtn.classList.add('hidden');
        if (mobileSuperAdminBtn) mobileSuperAdminBtn.classList.add('hidden');
        if (productLoginBtn)   productLoginBtn.classList.remove('hidden');
        if (productUserDropdown) productUserDropdown.classList.add('hidden');

        const gdBoard   = document.getElementById('user-gamification-board');
        const aiSection = document.getElementById('ai-recommendations-section');
        if (gdBoard)   gdBoard.classList.add('hidden');
        if (aiSection) aiSection.classList.add('hidden');
    }
}

// --- SYNC AUTH STATE ON PAGE LOAD ---
async function syncIndexAuthUI() {
    if (!window.LodeaAuth?.getSessionSafe) return;
    const session = await window.LodeaAuth.getSessionSafe();
    if (session?.user) {
        indexAuthUser = session.user;
        await updateUIForUser(session.user);
    }
}

function handlePostLoginRedirect() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (!redirect || !redirect.startsWith('product.html')) return;
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    window.location.replace(redirect);
}

// --- SETUP AUTH LISTENERS ---
function setupAuth() {
    initializeAuthElements();
    syncIndexAuthUI();

    // Listen for auth events from LodeaAuth
    if (supabaseClient) {
        window.addEventListener('lodea-auth', async (e) => {
            const { event, session } = e.detail || {};
            if (session?.user) {
                indexAuthUser = session.user;
                await updateUIForUser(session.user);
                if (event === 'SIGNED_IN') handlePostLoginRedirect();
                return;
            }
            if (event === 'SIGNED_OUT') {
                indexAuthUser = null;
                await updateUIForUser(null);
            }
        });
    }

    window.addEventListener('pageshow', () => syncIndexAuthUI());

    // Login button → redirect to login page
    if (loginBtn) loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });

    // Close auth modal
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => authModal?.classList.add('hidden'));
    if (authModal)     authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.add('hidden'); });

    // Switch login/register mode
    if (authSwitchLink) {
        authSwitchLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            resetMessages();
            if (authTitle)     authTitle.textContent     = isLoginMode ? 'تسجيل الدخول'    : 'إنشاء حساب جديد';
            if (btnText)       btnText.textContent       = isLoginMode ? 'تسجيل الدخول'    : 'إنشاء حساب';
            if (authSwitchMsg) authSwitchMsg.textContent = isLoginMode ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
            if (authSwitchLink) authSwitchLink.textContent = isLoginMode ? 'أنشئ حساباً الآن' : 'سجل دخولك';
        });
    }

    // Auth form submit
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetMessages();
            const email    = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;
            if (!email || !password) return;
            setLoading(true);
            try {
                if (isLoginMode) {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw new Error(error.message.includes('Invalid login credentials') ? 'بيانات الدخول غير صحيحة' : error.message);
                    if (data?.session?.user) {
                        const saved = window.LodeaAuth?.persistAuthSession ? await window.LodeaAuth.persistAuthSession(data.session) : data.session;
                        indexAuthUser = (saved || data.session).user;
                        await updateUIForUser(indexAuthUser);
                    }
                    authModal?.classList.add('hidden');
                } else {
                    const { data, error } = await supabaseClient.auth.signUp({ email, password });
                    if (error) throw new Error(error.message.includes('User already registered') ? 'هذا الحساب مسجل بالفعل.' : error.message);
                    if (data?.user?.identities?.length === 0) {
                        showError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
                    } else if (data?.session?.user) {
                        showSuccess('تم إنشاء الحساب بنجاح!');
                        const saved = window.LodeaAuth?.persistAuthSession ? await window.LodeaAuth.persistAuthSession(data.session) : data.session;
                        indexAuthUser = (saved || data.session).user;
                        await updateUIForUser(indexAuthUser);
                        setTimeout(() => authModal?.classList.add('hidden'), 1500);
                    } else {
                        showSuccess('تم إنشاء الحساب! يرجى مراجعة بريدك الإلكتروني للتأكيد.');
                    }
                }
            } catch (err) {
                showError(err.message || 'حدث خطأ غير متوقع');
            } finally {
                setLoading(false);
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (window.LodeaAuth?.signOut) await window.LodeaAuth.signOut();
            else if (supabaseClient) await supabaseClient.auth.signOut();
            indexAuthUser = null;
            await updateUIForUser(null);
        });
    }

    // Orders
    if (myOrdersBtn)    myOrdersBtn.onclick    = openOrdersModal;
    if (mobileOrdersBtn) mobileOrdersBtn.onclick = openOrdersModal;
    if (closeOrdersBtn) closeOrdersBtn.onclick = () => ordersModal?.classList.add('hidden');
    if (ordersModal)    ordersModal.onclick    = (e) => { if (e.target === ordersModal) ordersModal.classList.add('hidden'); };

    // Mobile account modal
    if (mobileLogoutBtn) {
        mobileLogoutBtn.onclick = async () => {
            if (window.LodeaAuth?.signOut) await window.LodeaAuth.signOut();
            else if (supabaseClient) await supabaseClient.auth.signOut();
            indexAuthUser = null;
            await updateUIForUser(null);
            mobileAccountModal?.classList.add('hidden');
        };
    }
    if (closeMobileAccountBtn) {
        closeMobileAccountBtn.onclick = () => mobileAccountModal?.classList.add('hidden');
    }
}

// Mobile account pill click
window.handleMobileAccountClick = async function () {
    if (!supabaseClient) return;
    const session = window.LodeaAuth?.getSessionSafe
        ? await window.LodeaAuth.getSessionSafe()
        : (await supabaseClient.auth.getSession()).data.session;
    if (!session?.user) {
        resetAuthForm();
        authModal?.classList.remove('hidden');
    } else {
        const el = document.getElementById('mobile-user-email');
        if (el) el.textContent = session.user.email;
        await updateUIForUser(session.user);
        mobileAccountModal?.classList.remove('hidden');
    }
};

// --- THEME TOGGLE (runs after DOM ready) ---
function initTheme() {
    const btn  = document.getElementById('theme-toggle-btn');
    const icon = document.getElementById('theme-icon') || document.querySelector('#theme-toggle-btn i');
    const dark = localStorage.getItem('theme') === 'dark';

    document.body.classList.toggle('dark-mode', dark);
    if (icon) {
        icon.classList.toggle('fa-sun',  dark);
        icon.classList.toggle('fa-moon', !dark);
    }

    if (!btn) return;
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const ic = document.getElementById('theme-icon') || document.querySelector('#theme-toggle-btn i');
        if (ic) {
            ic.classList.toggle('fa-sun',  isDark);
            ic.classList.toggle('fa-moon', !isDark);
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// --- MOCK PRODUCTS FALLBACK ---
function getMockProducts() {
    // No mock/fake products - only real data from Supabase
    return [];
}

// --- FETCH PRODUCTS ---
async function fetchProducts() {
    // Clear any previously cached mock/fake data
    try {
        const cached = localStorage.getItem('products_cache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.length && parsed.every(p => String(p.id).startsWith('mock-'))) {
                localStorage.removeItem('products_cache');
            }
        }
    } catch (e) {}

    // Try localStorage cache first for instant display
    try {
        const cached = localStorage.getItem('products_cache');
        if (cached) {
            const products = JSON.parse(cached);
            if (products.length > 0) { renderProductCards(products); productsCache = products; }
        }
    } catch (e) {}

    if (!supabaseClient) {
        // No Supabase → show empty state (no fake data)
        if (!productsCache.length) renderProductCards([]);
        return;
    }

    try {
        const fetchWithTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), ms))]);
        const { data, error } = await fetchWithTimeout(
            supabaseClient.from('products').select('*').order('created_at', { ascending: false }),
            15000
        );

        if (error || !data || data.length === 0) {
            // No real data available, keep showing cache or empty state
            if (!productsCache.length) renderProductCards([]);
            return;
        }

        productsCache = data;
        try { localStorage.setItem('products_cache', JSON.stringify(data)); } catch {}
        renderProductCards(data);

    } catch (err) {
        console.warn('fetchProducts error:', err);
        if (!productsCache.length) renderProductCards([]);
    }
}

// --- RENDER PRODUCT CARDS ---
function renderProductCards(products) {
    const limited = products.slice(0, 6);

    // 1. Fill غرف الشراء النشطة (hot-scroll)
    const hotScroll = document.getElementById('hot-scroll');
    if (hotScroll) {
        hotScroll.innerHTML = limited.slice(0, 3).map((product) => {
            const imgSrc = product.image_url || 'logo.png';
            const price  = product.price || product.wholesale_price || 0;
            const marketPrice = product.market_price || Math.round(price * 1.38);
            const discountPercent = (marketPrice > price && price > 0) ? Math.round((marketPrice - price) / marketPrice * 100) : 0;
            const category = product.category || 'عام';
            const targetBuyers  = product.target_buyers || 100;
            const seed = String(product.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const currentBuyers = product.buyers_count || (25 + (seed % 60));
            const progressPercent = Math.min(Math.round((currentBuyers / targetBuyers) * 100), 100);
            let subtitle = 'تفاوض جماعي';
            if (category === 'تكنولوجيا') {
                if (product.name.includes('ساعة') || product.name.toLowerCase().includes('watch')) subtitle = 'ساعة ذكية';
                else if (product.name.includes('سماعة') || product.name.toLowerCase().includes('airpods')) subtitle = 'سماعات لاسلكية';
                else if (product.name.includes('حاسوب') || product.name.toLowerCase().includes('laptop')) subtitle = 'حاسوب محمول';
                else subtitle = 'هاتف محمول';
            } else if (category.includes('منزلية') || category.includes('كهرومنزلية')) {
                subtitle = 'جهاز منزلي';
            }
            return `
                <div class="hot-card" onclick="goToProductPage('${product.id}')" style="cursor:pointer;">
                    <div style="position:relative;width:100%;display:flex;justify-content:center;align-items:center;background:#F9FAFB;border-radius:10px;margin-bottom:10px;">
                        <img src="${imgSrc}" class="hot-card-img" alt="${product.name}" onerror="this.src='logo.png'" style="margin-bottom:0;">
                        ${discountPercent > 0 ? `<div style="position:absolute;top:5px;right:5px;background:#EF4444;color:#fff;font-weight:800;font-size:0.7rem;padding:2px 6px;border-radius:10px;">-${discountPercent}%</div>` : ''}
                    </div>
                    <span class="hot-card-cat">${category}</span>
                    <h3 class="hot-card-name">${product.name}</h3>
                    <p class="hot-card-sub">${subtitle}</p>
                    <div class="hot-card-price">${Number(price).toLocaleString()} <span>دج</span></div>
                    <div class="hot-card-buyers"><i class="fas fa-users"></i> <span>${currentBuyers} / ${targetBuyers} مشترك</span></div>
                    <div style="margin:4px 0 10px 0;"><div style="height:5px;background:rgba(0,0,0,0.05);border-radius:10px;overflow:hidden;"><div style="width:${progressPercent}%;height:100%;background:#10B981;border-radius:10px;"></div></div></div>
                    <button class="hot-join-btn" onclick="event.stopPropagation();goToProductPage('${product.id}',true)">انضم الآن</button>
                </div>`;
        }).join('');
    }

    // 2. Fill hidden products-grid (for search/filter compatibility)
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) { startCountdowns(); return; }

    productsGrid.classList.remove('hidden');
    productsGrid.innerHTML = limited.map((product) => {
        const imgSrc = product.image_url || 'https://via.placeholder.com/300?text=LodeLode';
        const price  = product.price || product.wholesale_price || 0;
        const marketPrice = product.market_price || Math.round(price * 1.38);
        const discountPercent = (marketPrice > price && price > 0) ? Math.round((marketPrice - price) / marketPrice * 100) : 0;
        const category = product.category || 'عام';
        const targetBuyers  = product.target_buyers || 100;
        const seed = String(product.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const currentBuyers = product.buyers_count || (25 + (seed % 60));
        const progressPercent = Math.min(Math.round((currentBuyers / targetBuyers) * 100), 100);
        return `
            <div class="product-card" onclick="goToProductPage('${product.id}')" data-category="${category}" style="cursor:pointer;">
                <div class="product-img-wrapper" style="background:rgba(255,255,255,0.02);border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;height:180px;position:relative;">
                    ${discountPercent > 0 ? `<div style="position:absolute;top:10px;right:10px;background:var(--danger);color:#fff;font-weight:800;font-size:0.8rem;padding:4px 10px;border-radius:20px;z-index:2;">-${discountPercent}%</div>` : ''}
                    <img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=LodeLode'" style="max-height:150px;max-width:90%;object-fit:contain;">
                </div>
                <div class="product-body" style="padding:5px 0 0 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span class="product-category-tag" style="background:rgba(139,92,246,0.1);color:var(--primary-light);font-weight:800;font-size:0.75rem;padding:2px 10px;border-radius:20px;">${category}</span>
                        <span style="color:var(--accent-gold);font-size:0.8rem;font-weight:700;">★ 4.8</span>
                    </div>
                    <h3 class="product-name" style="font-size:1.05rem;font-weight:900;margin-bottom:6px;line-height:1.4;color:#fff;">${product.name}</h3>
                    <div class="product-progress-mini" style="margin:12px 0;">
                        <div style="display:flex;justify-content:space-between;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;">
                            <span style="color:var(--success);">👥 ${currentBuyers} انضموا</span><span>الهدف: ${targetBuyers}</span>
                        </div>
                        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;">
                            <div style="width:${progressPercent}%;height:100%;background:linear-gradient(90deg,var(--secondary),var(--primary));border-radius:10px;"></div>
                        </div>
                    </div>
                    <div class="product-countdown" data-seed="${seed}" style="font-size:0.8rem;color:var(--danger);font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:6px;background:rgba(244,63,94,0.05);padding:6px 12px;border-radius:10px;border:1.5px solid rgba(244,63,94,0.15);">
                        <span>⏳ ينتهي:</span><span class="timer-display" style="direction:ltr;font-family:monospace;">--:--:--</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-top:1px solid var(--border-light);padding-top:10px;">
                        <div>
                            <span style="display:block;font-size:0.8rem;color:var(--text-muted);text-decoration:line-through;">${discountPercent > 0 ? `${Math.round(marketPrice).toLocaleString()} دج` : ''}</span>
                            <span style="font-size:1.4rem;font-weight:900;color:var(--accent-gold);">${Number(price).toLocaleString()} <small style="font-size:0.8rem;">دج</small></span>
                        </div>
                        <span style="font-size:0.75rem;background:rgba(29,184,168,0.08);border:1px solid rgba(29,184,168,0.2);color:var(--success);padding:4px 10px;border-radius:10px;font-weight:800;">ضمان 100%</span>
                    </div>
                    <button class="join-btn" onclick="event.stopPropagation();goToProductPage('${product.id}',true)" style="width:100%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border:none;padding:12px;color:#fff;font-weight:800;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        🛒 انضم للصفقة الآن
                    </button>
                </div>
            </div>`;
    }).join('');

    startCountdowns();
}

// --- NAVIGATION ---
window.goToProductPage = function (id, scrollToCheckout = false) {
    if (!id) return;
    const product = productsCache?.find(p => String(p.id) === String(id));
    if (product) {
        if (typeof window.trackUserBrowsingCategory === 'function' && product.category)
            window.trackUserBrowsingCategory(product.category);
        try { sessionStorage.setItem('lodea_product_preview', JSON.stringify(product)); } catch {}
    }
    window.location.href = `product.html?id=${encodeURIComponent(id)}${scrollToCheckout ? '#checkout' : ''}`;
};

window.closeProductDetail = function () {
    const overlay = document.getElementById('product-detail-overlay');
    if (overlay) { overlay.classList.remove('active'); document.body.style.overflow = 'auto'; }
};

window.scrollToProducts = function () {
    document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
};

// --- CHECKOUT LOGIC ---
const checkoutModal = document.getElementById('checkout-modal');
if (checkoutModal) {
    const closeCheckoutBtn  = document.getElementById('close-checkout-btn');
    const checkoutForm      = document.getElementById('checkout-form');
    const checkoutSubmitBtn = document.getElementById('checkout-submit-btn');
    const checkoutError     = document.getElementById('checkout-error');
    const checkoutSuccess   = document.getElementById('checkout-success');

    window.openCheckout = async function (productId, productName) {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = 'login.html'; return; }

        document.getElementById('checkout-product-id').value   = productId;
        document.getElementById('checkout-product-name').value = productName;
        checkoutForm.reset();
        const savedPhone  = localStorage.getItem('lodea_phone');
        const savedWilaya = localStorage.getItem('lodea_wilaya');
        if (savedPhone)  document.getElementById('phone-number').value = savedPhone;
        if (savedWilaya) document.getElementById('wilaya').value       = savedWilaya;
        checkoutError?.classList.add('hidden');
        checkoutSuccess?.classList.add('hidden');
        checkoutModal.classList.remove('hidden');
    };

    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', () => checkoutModal.classList.add('hidden'));
    checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.classList.add('hidden'); });

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            checkoutError?.classList.add('hidden');
            checkoutSuccess?.classList.add('hidden');
            const bText    = checkoutSubmitBtn?.querySelector('.btn-text');
            const bSpinner = checkoutSubmitBtn?.querySelector('.btn-spinner');
            if (bText)    bText.classList.add('hidden');
            if (bSpinner) bSpinner.classList.remove('hidden');
            if (checkoutSubmitBtn) checkoutSubmitBtn.disabled = true;

            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً.');
                const orderData = {
                    product_id:   document.getElementById('checkout-product-id').value,
                    user_email:   session.user.email,
                    first_name:   document.getElementById('first-name').value,
                    last_name:    document.getElementById('last-name').value,
                    phone:        document.getElementById('phone-number').value,
                    wilaya:       document.getElementById('wilaya').value,
                    product_name: document.getElementById('checkout-product-name').value,
                    status:       'قيد المراجعة'
                };
                localStorage.setItem('lodea_phone',  orderData.phone);
                localStorage.setItem('lodea_wilaya', orderData.wilaya);
                const { error } = await supabaseClient.from('orders').insert([orderData]);
                if (error) throw error;
                showToast('تم تسجيل طلبك بنجاح! سنتصل بك قريباً.', 'success');
                setTimeout(() => checkoutModal.classList.add('hidden'), 2000);
            } catch (err) {
                showToast('حدث خطأ: ' + err.message, 'error');
            } finally {
                if (bText)    bText.classList.remove('hidden');
                if (bSpinner) bSpinner.classList.add('hidden');
                if (checkoutSubmitBtn) checkoutSubmitBtn.disabled = false;
            }
        });
    }
}

// --- MY ORDERS MODAL ---
async function openOrdersModal() {
    if (!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    ordersModal?.classList.remove('hidden');
    if (ordersList)  ordersList.innerHTML = '';
    if (ordersLoading) ordersLoading.classList.remove('hidden');
    if (ordersEmpty)   ordersEmpty.classList.add('hidden');

    try {
        const { data: orders, error } = await supabaseClient
            .from('orders').select('*')
            .eq('user_email', session.user.email)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (ordersLoading) ordersLoading.classList.add('hidden');

        if (orders && orders.length > 0) {
            ordersList.innerHTML = orders.map(order => {
                const date = new Date(order.created_at).toLocaleDateString('ar-DZ');
                let statusClass = 'status-pending';
                if (order.status === 'مؤكد')    statusClass = 'status-confirmed';
                if (order.status === 'مرفوض')   statusClass = 'status-rejected';
                if (order.status === 'تم الشحن') statusClass = 'status-shipped';
                return `
                    <div class="order-card-premium" onclick="this.classList.toggle('expanded')">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="color:var(--text-main);font-size:1.1rem;margin:0;">${order.product_name || 'منتج'}</h3>
                            <span class="order-status-badge ${statusClass}">${order.status || 'قيد المراجعة'}</span>
                        </div>
                        <div class="order-extra-details" style="margin-top:0;">
                            <div style="padding-top:1rem;border-top:1px solid rgba(255,255,255,0.05);margin-top:1rem;">
                                <div style="margin-bottom:0.6rem;"><span style="color:#94A3B8;font-size:0.8rem;">تاريخ الطلب:</span> <span style="color:var(--text-main);margin-right:8px;">${date}</span></div>
                                <div style="margin-bottom:0.6rem;"><span style="color:#94A3B8;font-size:0.8rem;">رقم التتبع:</span> <span style="color:var(--accent-gold);margin-right:8px;font-weight:700;">${order.tracking_number || 'بانتظار الشحن...'}</span></div>
                                <div><span style="color:#94A3B8;font-size:0.8rem;">شركة الشحن:</span> <span style="color:var(--text-main);margin-right:8px;">${order.shipping_company || 'سيتواصل معك فريقنا'}</span></div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        } else {
            ordersEmpty?.classList.remove('hidden');
        }
    } catch (err) {
        if (ordersLoading) ordersLoading.classList.add('hidden');
        if (ordersList) ordersList.innerHTML = `<p style="color:#F87171;text-align:center;">خطأ في تحميل الطلبات: ${err.message}</p>`;
    }
}

// --- COUNTDOWN TIMERS ---
function startCountdowns() {
    const elements = document.querySelectorAll('.product-countdown');
    if (!elements.length) return;
    const update = () => {
        const now = Date.now();
        elements.forEach(el => {
            const seed   = parseInt(el.dataset.seed) || 0;
            const display = el.querySelector('.timer-display');
            if (!display) return;
            const cycle   = 24 * 3600 * 1000;
            const timeLeft = cycle - ((now + seed * 1000) % cycle);
            const h = Math.floor(timeLeft / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        });
    };
    update();
    setInterval(update, 1000);
}

// --- SEARCH ---
window.handleTrendingSearch = function (term) {
    const input = document.getElementById('search-input');
    if (input) { input.value = term; input.dispatchEvent(new Event('input')); input.focus(); }
};

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const dropdown    = document.getElementById('search-results-dropdown');
    if (!searchInput || !dropdown) return;

    const synonymMap = { 'تلفون':'تكنولوجيا','هاتف':'تكنولوجيا','أيفون':'تكنولوجيا','ايفون':'تكنولوجيا','سماعة':'تكنولوجيا','ساعة':'تكنولوجيا','كورة':'رياضة','رياضة':'رياضة','مكياج':'جمال','تجميل':'جمال' };

    const showTrending = () => {
        if (searchInput.value.trim()) return;
        dropdown.innerHTML = `
            <div class="search-trending-title">🔥 عمليات بحث شائعة</div>
            <div class="search-trending-chips">
                <button class="trending-chip" onclick="window.handleTrendingSearch('تكنولوجيا')">📱 تكنولوجيا</button>
                <button class="trending-chip" onclick="window.handleTrendingSearch('سماعات')">🎧 سماعات</button>
                <button class="trending-chip" onclick="window.handleTrendingSearch('ساعة')">⌚ ساعة ذكية</button>
                <button class="trending-chip" onclick="window.handleTrendingSearch('هاتف')">📱 هاتف ذكي</button>
            </div>`;
        dropdown.classList.remove('hidden');
    };

    searchInput.addEventListener('focus', showTrending);
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const synonym = synonymMap[query] || '';
        document.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
            const cat  = (card.dataset.category || '').toLowerCase();
            const match = !query || name.includes(query) || cat.includes(query) || (synonym && cat.includes(synonym));
            card.style.display = match ? 'flex' : 'none';
        });
        if (!query) { showTrending(); return; }
        const matches = productsCache.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.category||'').toLowerCase().includes(query) ||
            (synonym && (p.category||'').toLowerCase().includes(synonym))
        ).slice(0, 5);
        dropdown.innerHTML = matches.length === 0
            ? `<div class="search-no-results">لا توجد نتائج لـ "${query}"</div>`
            : `<div class="search-trending-title" style="color:var(--secondary-light);">✨ مطابقة ذكية:</div>` +
              matches.map(p => `
                <div class="search-result-item" onclick="handleSearchSelect('${p.id}')">
                    <img src="${p.image_url || 'https://via.placeholder.com/40'}" alt="${p.name}">
                    <div class="search-result-info"><div class="search-result-title">${p.name}</div><div class="search-result-price">${Number(p.price||0).toLocaleString()} دج</div></div>
                </div>`).join('');
        dropdown.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#search-wrapper')) dropdown.classList.add('hidden'); });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dropdown.classList.add('hidden'); searchInput.value = ''; } });
}

window.handleSearchSelect = function (id) {
    const input    = document.getElementById('search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    if (input)    input.value = '';
    if (dropdown) dropdown.classList.add('hidden');
    goToProductPage(id);
};

// --- FILTERING ---
function setupFiltering() {
    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.category;
            document.querySelectorAll('.product-card').forEach(card => {
                card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
            });
        });
    });
}

// --- SOCIAL PROOF POPUPS ---
function setupSocialProof() {
    const spModal   = document.getElementById('social-proof');
    const spUser    = document.getElementById('sp-user');
    const spProduct = document.getElementById('sp-product');
    if (!spModal || !spUser || !spProduct) return;
    const names  = ['أحمد','مريم','ياسين','سارة','مصطفى','إيمان','حمزة'];
    const cities = ['وهران','الجزائر','عنابة','قسنطينة','سطيف','بجاية'];
    setInterval(() => {
        const allProducts = document.querySelectorAll('.product-name');
        if (!allProducts.length) return;
        spUser.textContent    = `${names[Math.floor(Math.random()*names.length)]} من ${cities[Math.floor(Math.random()*cities.length)]}`;
        spProduct.textContent = allProducts[Math.floor(Math.random()*allProducts.length)].textContent;
        spModal.classList.remove('hidden');
        setTimeout(() => spModal.classList.add('hidden'), 5000);
    }, 15000 + Math.random() * 10000);
}

// --- HERO COUNTER ANIMATION ---
function animateCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = parseInt(el.dataset.target);
            const start  = performance.now();
            (function tick(now) {
                const p = Math.min((now - start) / 2000, 1);
                el.textContent = Math.round((1 - Math.pow(1-p, 3)) * target).toLocaleString('ar-DZ') + '+';
                if (p < 1) requestAnimationFrame(tick);
            })(start);
            observer.unobserve(el);
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.hero-stat-num').forEach(c => observer.observe(c));
}

// --- HERO CAROUSEL ---
function initHeroCarousel() {
    const track  = document.getElementById('hero-carousel-track');
    const dots   = document.getElementById('hero-carousel-dots');
    const prevBtn = document.getElementById('hero-prev-btn');
    const nextBtn = document.getElementById('hero-next-btn');
    if (!track || !productsCache.length) return;

    const items = productsCache.slice(0, 5);
    track.innerHTML = '';
    if (dots) dots.innerHTML = '';

    items.forEach((p, i) => {
        const slide = document.createElement('div');
        slide.className = `hero-carousel-slide ${i === 0 ? 'active' : ''}`;
        slide.style.cursor = 'pointer';
        slide.onclick = () => goToProductPage(p.id);
        slide.innerHTML = `
            <img src="${p.image_url || 'https://via.placeholder.com/200'}" class="hero-carousel-img" alt="${p.name}">
            <div class="hc-title">${p.name}</div>
            <div class="hc-price">${Number(p.price||0).toLocaleString()} دج</div>
            <button class="btn-solid" style="padding:8px 20px;font-size:0.9rem;margin-top:15px;" onclick="event.stopPropagation();goToProductPage('${p.id}')">تصفح المنتج</button>`;
        track.appendChild(slide);
        if (dots) {
            const dot = document.createElement('div');
            dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(i);
            dots.appendChild(dot);
        }
    });

    let current = 0;
    let timer;
    const allSlides = track.querySelectorAll('.hero-carousel-slide');
    const allDots   = dots ? dots.querySelectorAll('.carousel-dot') : [];

    function goToSlide(idx) {
        allSlides[current].classList.remove('active');
        if (allDots[current]) allDots[current].classList.remove('active');
        current = (idx + allSlides.length) % allSlides.length;
        allSlides[current].classList.add('active');
        if (allDots[current]) allDots[current].classList.add('active');
    }

    function autoPlay() { clearInterval(timer); timer = setInterval(() => goToSlide(current + 1), 4000); }
    if (prevBtn) prevBtn.addEventListener('click', () => { goToSlide(current - 1); autoPlay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goToSlide(current + 1); autoPlay(); });
    autoPlay();
}

// --- SCROLL REVEAL ---
function initPremiumInteractions() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));

    const navbar = document.querySelector('.navbar');
    if (navbar) window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
}

// 3D card tilt
document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const rotX = ((e.clientY - rect.top  - rect.height/2) / (rect.height/2)) * -8;
    const rotY = ((e.clientX - rect.left - rect.width/2)  / (rect.width/2))  *  8;
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
});
document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.product-card');
    if (card) card.style.transform = '';
});

// --- EXPLAINER ANIMATION ---
function initExplainerAnimation() {
    const fill  = document.getElementById('explainer-progress-fill');
    if (!fill) return;
    const mobile = window.innerWidth <= 768;
    fill.style[mobile ? 'height' : 'width'] = '0%';
    const steps = ['.ex-step-1 .ex-icon', '.ex-step-2 .ex-icon', '.ex-step-3 .ex-icon'];
    const pcts  = ['33%', '66%', '100%'];
    const delays = [500, 2000, 3500];
    steps.forEach((sel, i) => {
        setTimeout(() => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.borderColor = i < 2 ? 'var(--primary)' : 'var(--success)';
                el.style.color       = i < 2 ? 'var(--primary)' : 'var(--success)';
                el.style.animation   = 'pulseIcon 2.5s infinite';
            }
            fill.style[mobile ? 'height' : 'width'] = pcts[i];
            if (i === 2) fill.classList.add('completed');
        }, delays[i]);
    });
}

// --- BACKGROUND PARALLAX ---
function initThreeBackground() {
    const bgImage  = document.getElementById('bg-image-parallax');
    const floating = document.getElementById('floating-elements');
    const fg       = document.getElementById('foreground-parallax');
    if (!document.getElementById('main-bg')) return;

    let mx = 0, my = 0, tx = 0, ty = 0, scrollY = 0;
    document.addEventListener('mousemove', (e) => { mx = (e.clientX/window.innerWidth-0.5)*2; my = (e.clientY/window.innerHeight-0.5)*2; });
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    if (floating) {
        [{ icon:'fa-paper-plane', top:'15%', left:'75%' }, { icon:'fa-rocket', top:'25%', left:'85%' },
         { icon:'fa-shopping-cart', top:'20%', left:'20%' }, { icon:'fa-box', top:'40%', left:'10%' },
         { icon:'fa-tag', top:'15%', left:'50%' }].forEach(item => {
            const d = document.createElement('div');
            d.className = 'drone-icon';
            d.style.top  = item.top;
            d.style.left = item.left;
            d.innerHTML  = `<i class="fas ${item.icon}"></i>`;
            floating.appendChild(d);
        });
    }

    let last = 0;
    (function animate(time) {
        requestAnimationFrame(animate);
        if (time - last < 22) return;
        last = time;
        tx += (mx * 30 - tx) * 0.08;
        ty += (my * 30 - ty) * 0.08;
        if (bgImage)  bgImage.style.transform  = `translate3d(${tx*.5}px,${ty*.5+(scrollY*-.05)}px,0) scale(1.05)`;
        if (floating) floating.style.transform = `translate3d(${-tx*1.8}px,${-ty*1.8+(scrollY*-.1)}px,0)`;
        if (fg)       fg.style.transform       = `translate3d(${tx*4}px,${ty*4+(scrollY*-.2)}px,0)`;
    })(0);
}

// --- NOTIFICATIONS BELL ---
window.toggleNotificationsDrawer = function () {
    const drawer = document.getElementById('notifications-drawer');
    if (!drawer) return;
    drawer.classList.toggle('hidden');
    const badge = document.getElementById('noti-badge');
    if (badge) badge.style.display = 'none';
};

// --- GAMIFICATION ENGINE ---
function getStreakAndXP() {
    return {
        xp:     parseInt(localStorage.getItem('lode_user_xp'))         || 0,
        level:  parseInt(localStorage.getItem('lode_user_level'))       || 1,
        streak: parseInt(localStorage.getItem('lode_user_streak'))      || 1,
        points: parseInt(localStorage.getItem('lode_referral_points'))  || 150
    };
}

window.checkStreakAndRewards = function (email) {
    const today     = new Date().toDateString();
    const lastLogin = localStorage.getItem('lode_last_login');
    let { xp, level, streak, points } = getStreakAndXP();
    if (lastLogin) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastLogin === yesterday.toDateString()) { streak += 1; xp += 25; setTimeout(() => showToast(`🔥 حافظت على تتابعك لـ ${streak} أيام! +25 XP`, 'success'), 2500); }
        else if (lastLogin !== today) streak = 1;
    } else { streak = 1; xp += 10; }
    localStorage.setItem('lode_user_xp', xp);
    localStorage.setItem('lode_user_level', level);
    localStorage.setItem('lode_user_streak', streak);
    localStorage.setItem('lode_last_login', today);
    localStorage.setItem('lode_referral_points', points);
    updateGamificationUI(email);
};

function updateGamificationUI(email) {
    const { xp, level, streak, points } = getStreakAndXP();
    const gdBoard = document.getElementById('user-gamification-board');
    if (!gdBoard) return;
    gdBoard.classList.remove('hidden');
    const initial = email ? email.substring(0,2).toUpperCase() : 'U';
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('user-gd-avatar', initial);
    setEl('user-gd-level', level);
    let title = 'المفاوض البرونزي 🥉';
    if (level >= 3  && level < 6)  title = 'المشتري الفضي 🥈';
    if (level >= 6  && level < 10) title = 'قائد الصفقات الذهبي 🥇';
    if (level >= 10) title = 'المفاوض الأسطوري 👑';
    setEl('user-gd-title', title);
    const xpNeeded = level * 100;
    const xpFill = document.getElementById('user-gd-xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min((xp/xpNeeded)*100, 100)}%`;
    setEl('user-gd-xp-text', `${xp} / ${xpNeeded} XP`);
    setEl('user-gd-streak', streak);
    setEl('user-gd-points', points);
    const bell = document.getElementById('noti-badge');
    if (bell && streak > 1) bell.style.display = 'block';
    const bs = document.getElementById('badge-streak'); if (bs && streak >= 3) bs.classList.add('active');
    const bl = document.getElementById('badge-legend'); if (bl && level  >= 5) bl.classList.add('active');
}

window.addXP = function (amount) {
    let { xp, level, streak, points } = getStreakAndXP();
    xp += amount;
    let leveled = false;
    while (xp >= level * 100) { xp -= level * 100; level += 1; leveled = true; }
    localStorage.setItem('lode_user_xp', xp);
    localStorage.setItem('lode_user_level', level);
    showToast(leveled ? `🎉 ترقيت إلى المستوى ${level}! 🏆` : `✨ حصلت على +${amount} XP!`, 'success');
    updateGamificationUI(localStorage.getItem('lode_last_login_email') || 'U');
};

// --- REFERRAL ---
window.openReferralModal = function () {
    const modal = document.getElementById('referral-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const { level, streak } = getStreakAndXP();
    const el = document.getElementById('user-ref-code');
    if (el) el.textContent = `LODE-REF-${level}${streak}99`;
};
window.closeReferralModal = function () { document.getElementById('referral-modal')?.classList.add('hidden'); };
window.copyReferralCode = function () {
    const code = document.getElementById('user-ref-code')?.textContent || 'LODE-REF-99';
    navigator.clipboard.writeText(code);
    showToast('📋 تم نسخ كود الإحالة!', 'success');
    window.addXP(15);
};
window.shareReferral = function () {
    const code = document.getElementById('user-ref-code')?.textContent || 'LODE-REF-99';
    const msg  = encodeURIComponent(`انضم إلي في LodeaLode.dz! كود إحالتي: ${code} 🎁`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=https://lodealode.com&quote=${msg}`, '_blank');
    window.addXP(25);
};

// --- TICKET CREATOR ---
window.openTicketModal = function (id, name, joined, needed, price, imgSrc) {
    const modal = document.getElementById('ticket-share-modal');
    if (!modal) return;
    const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
    set('ticket-product-title',  name);
    set('ticket-buyers-joined',  joined);
    set('ticket-buyers-needed',  needed);
    set('ticket-price',          Number(price).toLocaleString());
    set('ticket-code',           `#LODE-${String(id).substring(0,4).toUpperCase()}`);
    const img = document.getElementById('ticket-product-img');
    if (img && imgSrc) img.src = imgSrc;
    modal.classList.remove('hidden');
};
window.closeTicketModal  = function () { document.getElementById('ticket-share-modal')?.classList.add('hidden'); };
window.downloadTicketImage = function () {
    showToast('📸 جاري توليد التذكرة...', 'success');
    window.addXP(30);
    setTimeout(() => { showToast('📥 تم تنزيل التذكرة! شاركها الآن!', 'success'); window.closeTicketModal(); }, 1500);
};
window.copyTicketLink = function () { navigator.clipboard.writeText(window.location.href); showToast('📋 تم نسخ رابط الصفقة!', 'success'); window.addXP(15); };

// --- USER BEHAVIOR TRACKING ---
window.trackUserBrowsingCategory = function (category) {
    if (!category) return;
    try {
        let history = JSON.parse(localStorage.getItem('lode_browsing_history')) || [];
        history.push({ category, timestamp: Date.now() });
        if (history.length > 20) history.shift();
        localStorage.setItem('lode_browsing_history', JSON.stringify(history));
        setTimeout(() => { if (typeof window.renderAIPicks === 'function') window.renderAIPicks(); }, 100);
    } catch {}
};

// --- AI PICKS ---
window.renderAIPicks = function () {
    const aiSection = document.getElementById('ai-recommendations-section');
    const aiGrid    = document.getElementById('ai-recommendations-grid');
    if (!aiSection || !aiGrid || !productsCache.length) return;
    let history = [];
    try { history = JSON.parse(localStorage.getItem('lode_browsing_history')) || []; } catch {}
    const counts = {};
    history.forEach(item => { if (item.category) counts[item.category] = (counts[item.category]||0)+1; });
    let favCat = null, maxCount = 0;
    for (const cat in counts) { if (counts[cat] > maxCount) { maxCount = counts[cat]; favCat = cat; } }

    const scored = productsCache.map(p => {
        const price   = p.price || p.wholesale_price || 0;
        const mPrice  = p.market_price || Math.round(price*1.38);
        const disc    = mPrice > price ? Math.round((mPrice-price)/mPrice*100) : 0;
        const seed    = String(p.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
        const buyers  = p.buyers_count||(25+(seed%60));
        const target  = p.target_buyers||100;
        const prog    = Math.min(Math.round((buyers/target)*100),100);
        let score  = 0, reason = '⚡ صفقة رائجة في ولايتك!';
        if (favCat && p.category === favCat)  { score += 100; reason = `✨ ترشيح لأنك تصفحت ${p.category} مؤخراً!`; }
        else if (prog > 75)  { score += 50; reason = `🔥 يتبقى ${target-buyers} مقاعد فقط!`; }
        else if (disc > 35)  { score += 30; reason = `📈 وفر ${disc}% مباشرة من المصنع!`; }
        return { p, score, reason };
    }).sort((a,b)=>b.score-a.score).slice(0,2);

    aiGrid.innerHTML = scored.map(({ p, reason }) => {
        const price = p.price||p.wholesale_price||0;
        const mPrice = p.market_price||Math.round(price*1.38);
        const disc   = mPrice>price?Math.round((mPrice-price)/mPrice*100):0;
        const cat    = p.category||'عام';
        const seed   = String(p.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
        const buyers = p.buyers_count||(25+(seed%60));
        const target = p.target_buyers||100;
        const prog   = Math.min(Math.round((buyers/target)*100),100);
        return `
            <div class="product-card" onclick="goToProductPage('${p.id}')" data-category="${cat}" style="border:1.5px solid rgba(107,47,160,0.35);cursor:pointer;">
                <div class="product-img-wrapper"><div class="discount-badge" style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;">ترشيح ✨</div>
                    <img src="${p.image_url||'logo.png'}" alt="${p.name}" loading="lazy"></div>
                <div class="product-body">
                    <span class="product-category-tag">${cat}</span>
                    <h3 class="product-name">${p.name}</h3>
                    <div style="background:rgba(107,47,160,0.1);border:1px solid rgba(107,47,160,0.3);border-radius:12px;padding:8px 12px;font-size:0.8rem;color:#9B6FD4;margin:10px 0;">💡 ${reason}</div>
                    <div class="product-progress-mini"><div class="progress-labels-mini"><span>👥 ${buyers} انضموا</span><span>الهدف: ${target}</span></div>
                        <div class="progress-track-mini"><div class="progress-fill-mini" style="width:${prog}%;background:linear-gradient(90deg,var(--primary),var(--secondary));"></div></div></div>
                    <div class="product-pricing-row">${disc>0?`<span class="old-price">${Math.round(mPrice).toLocaleString()} دج</span>`:''}<span class="new-price">${Number(price).toLocaleString()} دج</span></div>
                    <button class="join-btn" style="background:linear-gradient(135deg,var(--primary),var(--secondary));" onclick="event.stopPropagation();goToProductPage('${p.id}',true)">⚡ احجز الآن</button>
                </div>
            </div>`;
    }).join('');
    aiSection.classList.remove('hidden');
};

// --- LEAD MAGNET ---
window.handleLeadMagnetSubmit = function () {
    const input = document.getElementById('lead-magnet-contact');
    if (!input?.value.trim()) return;
    showToast('🎉 تم تسجيلك! كود LODE-WELCOME مُرسل إليك!', 'success');
    if (typeof window.addXP === 'function') window.addXP(50);
    input.value = '';
};

// ==========================================
// GLOBAL INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 0. Apply saved theme immediately
    initTheme();

    // 1. Setup auth
    setupAuth();

    // 2. Fetch & render products, then chain dependent setup
    fetchProducts().then(() => {
        setupFiltering();
        setupSearch();
        setupSocialProof();
        animateCounters();
        initHeroCarousel();
    });

    // 3. UI polish
    initPremiumInteractions();
    initExplainerAnimation();
    if (typeof initThreeBackground === 'function') initThreeBackground();
});