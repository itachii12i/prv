const SUPABASE_URL = window.LodeaAuth?.SUPABASE_URL || 'https://xhjyszxrnkqolrynsffi.supabase.co';
const SUPABASE_ANON_KEY = window.LodeaAuth?.SUPABASE_ANON_KEY || 'sb_publishable_vIx5AuAzJ_4BkFOx1E0gyg_Xf0B0e5C';

let supabaseClient = null;
let productAuthReady = false;

const WILAYAS = [
    'أدرار',
    'الشلف',
    'الأغواط',
    'أم البواقي',
    'باتنة',
    'بجاية',
    'بسكرة',
    'بشار',
    'البليدة',
    'البويرة',
    'تمنراست',
    'تبسة',
    'تلمسان',
    'تيارت',
    'تيزي وزو',
    'الجزائر العاصمة',
    'الجلفة',
    'جيجل',
    'سطيف',
    'سعيدة',
    'سكيكدة',
    'سيدي بلعباس',
    'عنابة',
    'قالمة',
    'قسنطينة',
    'المدية',
    'مستغانم',
    'المسيلة',
    'معسكر',
    'ورقلة',
    'وهران',
    'البيض',
    'إليزي',
    'برج بوعريريج',
    'بومرداس',
    'الطارف',
    'تندوف',
    'تيسمسيلت',
    'الوادي',
    'خنشلة',
    'سوق أهراس',
    'تيبازة',
    'ميلة',
    'عين الدفلى',
    'النعامة',
    'عين تموشنت',
    'غرداية',
    'غليزان',
    'المغير',
    'المنيعة',
    'أولاد جلال',
    'برج باجي مختار',
    'بني عباس',
    'تيميمون',
    'تقرت',
    'جانت',
    'إن صالح',
    'إن قزام'
];

let currentProduct = null;
let countdownTimer = null;
let isLoginMode = true;
let currentSession = null;

function initSupabase() {
    supabaseClient = window.LodeaAuth?.getSupabaseClient?.() || null;
}

function setCheckoutAuthLoading(loading) {
    const el = document.getElementById('checkout-auth-loading');
    if (!el) return;
    el.classList.toggle('hidden', !loading);
    if (loading) {
        document.getElementById('checkout-login-gate')?.classList.add('hidden');
        document.getElementById('order-form')?.classList.add('hidden');
        document.getElementById('checkout-user-badge')?.classList.add('hidden');
    }
}

function withTimeout(promise, ms = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
}

function hideLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('hidden');
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('page-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `product-toast show ${type}`;
    setTimeout(() => { toast.className = 'product-toast'; }, 4000);
}

function showNotFound(message) {
    hideLoader();
    document.getElementById('product-main')?.classList.add('hidden');
    const notFound = document.getElementById('not-found');
    if (message) {
        const msgEl = document.getElementById('not-found-msg');
        if (msgEl) msgEl.textContent = message;
    }
    notFound?.classList.remove('hidden');
}

function showProduct() {
    hideLoader();
    document.getElementById('not-found')?.classList.add('hidden');
    document.getElementById('product-main')?.classList.remove('hidden');
}

function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

function getCachedProduct(productId) {
    try {
        const preview = sessionStorage.getItem('lodea_product_preview');
        if (preview) {
            const p = JSON.parse(preview);
            if (String(p.id) === String(productId)) return p;
        }
        const cached = localStorage.getItem('products_cache');
        if (cached) {
            const list = JSON.parse(cached);
            const found = list.find(item => String(item.id) === String(productId));
            if (found) return found;
        }
    } catch (err) {
        console.warn('Cache read failed:', err);
    }
    return null;
}

async function fetchProductFromApi(productId) {
    const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=*`;
    const response = await withTimeout(fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
    }));

    if (!response.ok) throw new Error('fetch_failed');
    const data = await response.json();
    return data[0] || null;
}

function productSeed(id) {
    return String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function startCountdown(seed) {
    if (countdownTimer) clearInterval(countdownTimer);

    const update = () => {
        const el = document.getElementById('countdown');
        if (!el) return;
        const cycle = 24 * 60 * 60 * 1000;
        const remaining = cycle - ((Date.now() + seed * 1000) % cycle);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    update();
    countdownTimer = setInterval(update, 1000);
}

window.shareProduct = function() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            text: `انضم معي في صفقة الشراء الجماعي لـ ${currentProduct?.name || 'هذا المنتج'} للحصول على أفضل سعر!`,
            url: window.location.href
        }).catch(err => console.log(err));
    } else {
        window.copyProductLink();
    }
};

window.copyProductLink = function() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('تم نسخ رابط المنتج بنجاح!', 'success');
    }).catch(() => {
        showToast('فشل نسخ الرابط', 'error');
    });
};

function renderProduct(product) {
    currentProduct = product;

    const price = Number(product.price || product.wholesale_price || product.base_price || 0);
    const marketPrice = Number(product.market_price || Math.round(price * 1.38));
    const discount = marketPrice > price && price > 0
        ? Math.round(((marketPrice - price) / marketPrice) * 100)
        : 0;
    const targetBuyers = Number(product.target_buyers || 15);
    const seed = productSeed(product.id);
    const currentBuyers = Number(product.buyers_count || Math.round(targetBuyers * 0.66));
    const progress = Math.min(Math.round((currentBuyers / targetBuyers) * 100), 100);
    const imgSrc = product.image_url || 'https://via.placeholder.com/400?text=LodeLode';
    const description = product.description || product.specifications || 'لا توجد مواصفات مفصلة لهذا المنتج.';

    document.title = `${product.name} – LodeaLode.dz`;

    const img = document.getElementById('product-image');
    if (img) {
        img.src = imgSrc;
        img.alt = product.name;
        img.onerror = () => { img.src = 'https://via.placeholder.com/400?text=LodeLode'; };
    }

    const discountTag = document.getElementById('discount-tag');
    if (discountTag) {
        if (discount > 0) {
            discountTag.textContent = `-${discount}%`;
            discountTag.classList.remove('hidden');
        } else {
            discountTag.classList.add('hidden');
        }
    }

    const breadcrumbName = document.getElementById('breadcrumb-name');
    if (breadcrumbName) breadcrumbName.textContent = product.name;

    const marketEl = document.getElementById('market-price');
    if (marketEl) {
        if (discount > 0) {
            marketEl.textContent = `السعر في السوق: ${marketPrice.toLocaleString('ar-DZ')} دج`;
            marketEl.classList.remove('hidden');
        } else {
            marketEl.classList.add('hidden');
        }
    }

    const currentPriceEl = document.getElementById('current-price');
    if (currentPriceEl) currentPriceEl.textContent = price.toLocaleString('ar-DZ');

    const savingsEl = document.getElementById('savings-text');
    const savings = marketPrice - price;
    if (savingsEl) {
        if (savings > 0) {
            savingsEl.textContent = `💰 توفر ${savings.toLocaleString('ar-DZ')} دج مقارنة بالسوق!`;
            savingsEl.classList.remove('hidden');
        } else {
            savingsEl.classList.add('hidden');
        }
    }

    // Dynamic Specs & Title assignment
    const titleEl = document.getElementById('product-title');
    if (titleEl) titleEl.textContent = product.name;

    const specBadgesContainer = document.getElementById('product-spec-badges');
    const subtitleEl = document.getElementById('product-subtitle');
    const categoryEl = document.getElementById('product-category');
    
    if (specBadgesContainer) {
        specBadgesContainer.innerHTML = '';
        let badges = ["شحن سريع", "ضمان 100%"];
        const nameLower = product.name.toLowerCase();
        
        if (nameLower.includes('macbook') || nameLower.includes('حاسوب') || nameLower.includes('laptop')) {
            badges = ["M3 Pro", "512GB SSD", "16GB RAM", "شاشة Liquid Retina"];
            if (categoryEl) categoryEl.textContent = 'حاسوب محمول';
            if (subtitleEl) subtitleEl.textContent = 'أداء جبار للمحترفين والمطورين';
        } else if (nameLower.includes('iphone') || nameLower.includes('هاتف') || nameLower.includes('samsung') || nameLower.includes('xiaomi')) {
            badges = ["تيتانيوم", "256GB", "شاشة 120Hz", "كاميرا 48MP"];
            if (categoryEl) categoryEl.textContent = 'هاتف ذكي';
            if (subtitleEl) subtitleEl.textContent = 'قوة تصوير واستخدام استثنائي';
        } else if (nameLower.includes('watch') || nameLower.includes('ساعة')) {
            badges = ["Ultra 2", "GPS + Cellular", "مقاومة الماء", "شاشة Retina"];
            if (categoryEl) categoryEl.textContent = 'ساعة ذكية';
            if (subtitleEl) subtitleEl.textContent = 'ساعة المغامرات والرياضيين الفخمة';
        } else {
            badges = [product.category || 'كهرومنزلي', 'ضمان سنة', 'أصلي 100%'];
            if (categoryEl) categoryEl.textContent = product.category || 'أجهزة كهرومنزلي';
            if (subtitleEl) subtitleEl.textContent = 'ضمان ممتد وتوصيل لباب المنزل';
        }
        
        badges.forEach(badge => {
            const span = document.createElement('span');
            span.className = 'spec-badge';
            span.textContent = badge;
            specBadgesContainer.appendChild(span);
        });
    }

    // Dynamic member text, remaining seats, and progress bar
    const remaining = Math.max(targetBuyers - currentBuyers, 0);
    const joinedTextEl = document.getElementById('group-joined-text');
    if (joinedTextEl) joinedTextEl.textContent = `${currentBuyers} / ${targetBuyers} مشترك`;

    const remainingTextEl = document.getElementById('group-remaining-text');
    if (remainingTextEl) {
        remainingTextEl.textContent = remaining > 0 ? `${remaining} أماكن متبقية` : "اكتمل العدد!";
    }

    const progressFillEl = document.getElementById('progress-fill');
    if (progressFillEl) progressFillEl.style.width = `${progress}%`;

    // Dynamic timeline setup
    const step1Price = Math.round(price * 1.09);
    const step2Price = Math.round(price * 1.04);
    const step1Threshold = Math.max(Math.round(targetBuyers * 0.25), 1);
    const step2Threshold = Math.max(Math.round(targetBuyers * 0.55), 2);

    const timelineStep1Val = document.getElementById('timeline-step1-val');
    if (timelineStep1Val) timelineStep1Val.textContent = `${step1Price.toLocaleString('ar-DZ')} دج`;

    const timelineStep2Val = document.getElementById('timeline-step2-val');
    if (timelineStep2Val) timelineStep2Val.textContent = `${step2Price.toLocaleString('ar-DZ')} دج`;

    const timelineStep3Val = document.getElementById('timeline-step3-val');
    if (timelineStep3Val) timelineStep3Val.textContent = `${price.toLocaleString('ar-DZ')} دج`;

    const timelineStep1Lbl = document.getElementById('timeline-step1-lbl');
    if (timelineStep1Lbl) timelineStep1Lbl.textContent = `عند ${step1Threshold} مشتركين`;

    const timelineStep2Lbl = document.getElementById('timeline-step2-lbl');
    if (timelineStep2Lbl) timelineStep2Lbl.textContent = `عند ${step2Threshold} مشتركين`;

    const timelineStep3Lbl = document.getElementById('timeline-step3-lbl');
    if (timelineStep3Lbl) timelineStep3Lbl.textContent = `بعد انضمامك الآن (${currentBuyers}/${targetBuyers})`;

    // Fill hidden form fields
    const orderProdId = document.getElementById('order-product-id');
    if (orderProdId) orderProdId.value = product.id;

    const orderProdName = document.getElementById('order-product-name');
    if (orderProdName) orderProdName.value = product.name;

    const descEl = document.getElementById('product-description');
    if (descEl) descEl.textContent = description;

    startCountdown(seed);
}

function fillWilayaSelect() {
    const select = document.getElementById('order-wilaya');
    if (!select || select.options.length > 1) return;

    WILAYAS.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `🇩🇿 ${name}`;
        select.appendChild(option);
    });
}

async function loadUserProfileData(session) {
    const profile = {
        first_name: localStorage.getItem('lodea_fname') || '',
        last_name: localStorage.getItem('lodea_lname') || '',
        phone: localStorage.getItem('lodea_phone') || '',
        wilaya: localStorage.getItem('lodea_wilaya') || ''
    };

    if (supabaseClient && session?.user?.email) {
        try {
            const { data } = await supabaseClient
                .from('orders')
                .select('first_name, last_name, phone, wilaya')
                .eq('user_email', session.user.email)
                .limit(1)
                .maybeSingle();

            if (data) {
                profile.first_name = data.first_name || profile.first_name;
                profile.last_name = data.last_name || profile.last_name;
                profile.phone = data.phone || profile.phone;
                profile.wilaya = data.wilaya || profile.wilaya;
            }
        } catch (err) {
            console.warn('Could not load user profile:', err);
        }
    }

    return profile;
}

function prefillOrderForm(profile) {
    if (profile.first_name) document.getElementById('order-fname').value = profile.first_name;
    if (profile.last_name) document.getElementById('order-lname').value = profile.last_name;
    if (profile.phone) document.getElementById('order-phone').value = profile.phone;
    if (profile.wilaya) document.getElementById('order-wilaya').value = profile.wilaya;
}

function applyProductSession(session) {
    if (!session?.user) return false;
    currentSession = session;
    updateCheckoutAuthUI(session);
    return true;
}

function clearProductSession() {
    currentSession = null;
    updateCheckoutAuthUI(null);
}

function updateCheckoutAuthUI(session) {
    currentSession = session;
    const loginGate = document.getElementById('checkout-login-gate');
    const orderForm = document.getElementById('order-form');
    const userBadge = document.getElementById('checkout-user-badge');
    const navUser = document.getElementById('product-nav-user');
    const navLogin = document.getElementById('product-login-btn');
    const navEmail = document.getElementById('product-nav-email');
    const checkoutEmail = document.getElementById('checkout-user-email');

    if (session?.user) {
        loginGate?.classList.add('hidden');
        orderForm?.classList.remove('hidden');
        userBadge?.classList.remove('hidden');
        navUser?.classList.remove('hidden');
        navLogin?.classList.add('hidden');
        if (navEmail) navEmail.textContent = session.user.email;
        if (checkoutEmail) checkoutEmail.textContent = session.user.email;
        
        // Update user avatar initials everywhere
        const initial = session.user.email.charAt(0).toUpperCase();
        const avatarInitial = document.getElementById('product-avatar-initial');
        if (avatarInitial) avatarInitial.textContent = initial;
        const checkoutBadgeAvatar = document.getElementById('checkout-badge-avatar');
        if (checkoutBadgeAvatar) checkoutBadgeAvatar.textContent = initial;

        loadUserProfileData(session).then(prefillOrderForm);
    } else {
        loginGate?.classList.remove('hidden');
        orderForm?.classList.add('hidden');
        userBadge?.classList.add('hidden');
        navUser?.classList.add('hidden');
        navLogin?.classList.remove('hidden');
    }
}

function openProductAuth(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    window.location.href = 'login.html';
}

function closeProductAuth() {
    document.getElementById('product-auth-modal')?.classList.add('hidden');
}

function resetProductAuthMessages() {
    document.getElementById('product-auth-error')?.classList.add('hidden');
    document.getElementById('product-auth-success')?.classList.add('hidden');
}

function setProductAuthLoading(loading) {
    const btn = document.getElementById('product-auth-submit');
    const btnText = document.getElementById('product-auth-btn-text');
    const spinner = document.getElementById('product-auth-spinner');
    if (!btn) return;
    btn.disabled = loading;
    btnText?.classList.toggle('hidden', loading);
    spinner?.classList.toggle('hidden', !loading);
}

function toggleProductAuthMode() {
    isLoginMode = !isLoginMode;
    resetProductAuthMessages();
    document.getElementById('product-auth-title').textContent = isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    document.getElementById('product-auth-btn-text').textContent = isLoginMode ? 'تسجيل الدخول' : 'إنشاء الحساب';
    document.getElementById('product-auth-switch-msg').textContent = isLoginMode ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
    document.getElementById('product-auth-switch-link').textContent = isLoginMode ? 'أنشئ حساباً الآن' : 'سجل دخولك';
}

async function handleProductAuthSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('خدمة تسجيل الدخول غير متاحة', 'error');
        return;
    }

    resetProductAuthMessages();
    setProductAuthLoading(true);

    const email = document.getElementById('product-auth-email').value.trim();
    const password = document.getElementById('product-auth-password').value;
    const errorEl = document.getElementById('product-auth-error');
    const successEl = document.getElementById('product-auth-success');

    try {
        let result;
        if (isLoginMode) {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
            if (result.error) {
                if (result.error.message.includes('Invalid login credentials')) {
                    throw new Error('بيانات الدخول غير صحيحة');
                }
                throw result.error;
            }
        } else {
            result = await supabaseClient.auth.signUp({ email, password });
            if (result.error) throw result.error;
            if (result.data?.user?.identities?.length === 0) {
                throw new Error('هذا البريد الإلكتروني مسجل بالفعل');
            }
        }

        let session = result.data?.session;
        if (session?.user) {
            if (window.LodeaAuth?.persistAuthSession) {
                session = await window.LodeaAuth.persistAuthSession(session);
            }
            applyProductSession(session);
            const profile = await loadUserProfileData(session);
            prefillOrderForm(profile);

            if (window.LodeaAuth?.getSessionSafe) {
                const verified = await window.LodeaAuth.getSessionSafe();
                if (verified?.user) applyProductSession(verified);
            }

            closeProductAuth();
            document.getElementById('product-auth-form')?.reset();
            showToast(isLoginMode ? 'تم تسجيل الدخول بنجاح!' : 'مرحباً بك! يمكنك إتمام الطلب الآن.', 'success');
            scrollToCheckoutIfNeeded();
            return;
        }

        if (!isLoginMode) {
            successEl.textContent = 'تم إنشاء الحساب! إذا لم يُفتح النموذج تلقائياً، راجع بريدك للتأكيد ثم سجّل الدخول.';
            successEl.classList.remove('hidden');
            return;
        }

        throw new Error('تعذّر إنشاء الجلسة. حاول مجدداً.');
    } catch (err) {
        errorEl.textContent = err.message || 'حدث خطأ، حاول مجدداً';
        errorEl.classList.remove('hidden');
    } finally {
        setProductAuthLoading(false);
    }
}

function setupProductAuth() {
    document.getElementById('product-login-btn')?.addEventListener('click', openProductAuth);
    document.getElementById('checkout-login-btn')?.addEventListener('click', openProductAuth);
    document.getElementById('product-close-auth')?.addEventListener('click', closeProductAuth);
    document.getElementById('product-auth-switch-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleProductAuthMode();
    });
    document.getElementById('product-auth-form')?.addEventListener('submit', handleProductAuthSubmit);
    document.getElementById('product-logout-btn')?.addEventListener('click', async () => {
        if (window.LodeaAuth?.signOut) await window.LodeaAuth.signOut();
        else if (supabaseClient) await supabaseClient.auth.signOut();
        clearProductSession();
        showToast('تم تسجيل الخروج', 'success');
    });

    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            
            if (isDark) {
                if (themeIcon) {
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }
                localStorage.setItem('theme', 'dark');
            } else {
                if (themeIcon) {
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                }
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // User Dropdown Toggle
    const userAvatarBtn = document.getElementById('product-user-avatar-btn');
    const userDropdown = document.getElementById('product-nav-user');
    
    if (userAvatarBtn && userDropdown) {
        userAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    const authModal = document.getElementById('product-auth-modal');
    const authModalContent = authModal?.querySelector('.modal-content');
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeProductAuth();
    });
    authModalContent?.addEventListener('click', (e) => e.stopPropagation());

    if (supabaseClient) {
        window.addEventListener('lodea-auth', (e) => {
            const { event, session } = e.detail || {};
            if (session?.user) {
                applyProductSession(session);
                return;
            }
            if (event === 'SIGNED_OUT') {
                clearProductSession();
            }
        });

        void bootstrapProductAuth();
    } else {
        setCheckoutAuthLoading(false);
        clearProductSession();
    }

    window.addEventListener('pageshow', () => {
        if (supabaseClient) void bootstrapProductAuth(false);
    });
}

async function bootstrapProductAuth(showLoading = true) {
    if (!supabaseClient || !window.LodeaAuth) {
        setCheckoutAuthLoading(false);
        if (!currentSession?.user) clearProductSession();
        return;
    }

    if (showLoading) setCheckoutAuthLoading(true);
    const session = await window.LodeaAuth.getSessionSafe();
    productAuthReady = true;
    setCheckoutAuthLoading(false);

    if (session?.user) {
        applyProductSession(session);
        if (window.location.hash === '#checkout') scrollToCheckoutIfNeeded();
    } else if (!currentSession?.user) {
        clearProductSession();
    }
}

function scrollToCheckoutIfNeeded() {
    if (window.location.hash !== '#checkout') return;
    setTimeout(() => {
        document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
}

async function loadProductPage() {
    const productId = getProductIdFromUrl();

    // Safety net: always hide loader after 6 seconds no matter what
    const safetyTimer = setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader && !loader.classList.contains('hidden')) {
            console.warn('Safety timeout: forcing loader hide');
            if (productId) {
                showNotFound('انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مجدداً.');
            } else {
                showNotFound('لم يتم تحديد منتج. ارجع للصفحة الرئيسية واختر صفقة.');
            }
        }
    }, 6000);

    if (!productId) {
        clearTimeout(safetyTimer);
        showNotFound('لم يتم تحديد منتج. ارجع للصفحة الرئيسية واختر صفقة.');
        return;
    }

    fillWilayaSelect();

    // Try to show cached version immediately (instant load)
    const cached = getCachedProduct(productId);
    if (cached) {
        renderProduct(cached);
        showProduct();
        scrollToCheckoutIfNeeded();
    }

    // Always attempt to fetch fresh data from API
    try {
        const product = await fetchProductFromApi(productId);
        clearTimeout(safetyTimer);
        if (!product) {
            if (!cached) showNotFound('لم نتمكن من العثور على هذه الصفقة.');
            return;
        }
        renderProduct(product);
        showProduct();
        scrollToCheckoutIfNeeded();
    } catch (err) {
        clearTimeout(safetyTimer);
        console.error('Product load error:', err);
        if (!cached) {
            const msg = err.message === 'timeout'
                ? 'انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مجدداً.'
                : 'تعذّر تحميل المنتج. حاول تحديث الصفحة.';
            showNotFound(msg);
        }
    }

    if (supabaseClient && productAuthReady && currentSession?.user) {
        applyProductSession(currentSession);
    }
}

async function submitOrder(event) {
    event.preventDefault();

    if (!currentSession?.user) {
        openProductAuth();
        showToast('يرجى تسجيل الدخول أولاً لإتمام الطلب', 'error');
        return;
    }

    const errorEl = document.getElementById('order-error');
    const btn = document.getElementById('order-submit-btn');
    const btnText = document.getElementById('order-btn-text');
    const spinner = document.getElementById('order-spinner');

    errorEl.classList.add('hidden');

    const orderData = {
        product_id: document.getElementById('order-product-id').value,
        product_name: document.getElementById('order-product-name').value,
        first_name: document.getElementById('order-fname').value.trim(),
        last_name: document.getElementById('order-lname').value.trim(),
        phone: document.getElementById('order-phone').value.trim(),
        wilaya: document.getElementById('order-wilaya').value,
        status: 'قيد المراجعة'
    };

    const note = document.getElementById('order-note').value.trim();
    if (note) orderData.note = note;

    if (!orderData.first_name || !orderData.last_name || !orderData.phone || !orderData.wilaya) {
        errorEl.textContent = 'يرجى ملء جميع الحقول المطلوبة.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        orderData.user_email = currentSession.user.email;

        localStorage.setItem('lodea_fname', orderData.first_name);
        localStorage.setItem('lodea_lname', orderData.last_name);
        localStorage.setItem('lodea_phone', orderData.phone);
        localStorage.setItem('lodea_wilaya', orderData.wilaya);

        if (supabaseClient) {
            const { error } = await supabaseClient.from('orders').insert([orderData]);
            if (error) throw error;
        } else {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal'
                },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error('order_failed');
        }

        document.getElementById('order-form').classList.add('hidden');
        document.getElementById('order-success').classList.remove('hidden');
        showToast('تم تسجيل طلبك بنجاح! سنتصل بك قريباً.', 'success');
    } catch (err) {
        console.error('Order error:', err);
        errorEl.textContent = 'حدث خطأ أثناء إرسال الطلب. حاول مجدداً.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

window.toggleNotificationsDrawer = function () {
    const drawer = document.getElementById('notifications-drawer');
    if (!drawer) return;
    drawer.classList.toggle('hidden');
    const badge = document.getElementById('noti-badge');
    if (badge) badge.style.display = 'none';
};

// NOTE: Initialization is handled by the inline script at the bottom of product.html
// to avoid double-initialization from multiple DOMContentLoaded listeners.
window._productPageInit = function() {
    initSupabase();
    setupProductAuth();
    document.getElementById('order-form')?.addEventListener('submit', submitOrder);

    const homeLoginLink = document.getElementById('login-via-home-link');
    const productId = getProductIdFromUrl();
    if (homeLoginLink && productId) {
        homeLoginLink.href = `index.html?redirect=${encodeURIComponent(`product.html?id=${productId}`)}`;
    }

    loadProductPage();
};
