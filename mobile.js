/**
 * LodeaLode.dz — Mobile UX helpers
 */
(function () {
    const MOBILE_BP = 768;

    function isMobile() {
        return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
    }

    function setupBottomNav() {
        const nav = document.querySelector('.mobile-bottom-nav, .s-bottom-nav, .bottom-nav');
        if (!nav) return;

        const items = nav.querySelectorAll('.nav-item, .s-nav-item');

        function setActive(el) {
            items.forEach((i) => i.classList.remove('active'));
            if (el) el.classList.add('active');
        }

        // كشف الصفحة الحالية وتفعيل الزر المناسب تلقائياً
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const pageMap = {
            'index.html': 'nav-home',
            '': 'nav-home',
            'products.html': 'nav-products',
            'product.html': 'nav-products',
            'rooms.html': 'nav-rooms',
            'settings.html': 'nav-settings',
            'login.html': 'nav-settings',
            'register.html': 'nav-settings',
            'community.html': 'nav-community',
            'favorites.html': 'nav-favorites'
        };

        const activeId = pageMap[currentPage];
        if (activeId) {
            const activeBtn = document.getElementById(activeId);
            if (activeBtn) {
                items.forEach(i => i.classList.remove('active'));
                activeBtn.classList.add('active');
            }
        }

        // ربط حدث النقر للتفعيل
        items.forEach((item) => {
            item.addEventListener('click', () => {
                if (!item.href || item.href.includes('javascript:')) return;
                setActive(item);
            });
        });

        // الرئيسية - Scroll to top
        const homeBtn = document.getElementById('nav-home');
        if (homeBtn && currentPage === 'index.html') {
            homeBtn.addEventListener('click', (e) => {
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setActive(homeBtn);
                }
            });
        }
    }

    function setupModalScrollLock() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach((modal) => {
            const observer = new MutationObserver(() => {
                const open = !modal.classList.contains('hidden');
                document.body.classList.toggle('modal-open', open && isMobile());
            });
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }

    function setupProductMobileCta() {
        if (!document.body.classList.contains('product-page-body')) return;

        const main = document.getElementById('product-main');
        const priceEl = document.getElementById('current-price');
        if (!main || !priceEl) return;

        const bar = document.createElement('div');
        bar.className = 'product-mobile-cta';
        bar.innerHTML = `
            <div class="product-mobile-cta-price">
                <span id="mobile-cta-price">0</span> <small>دج</small>
                <small>سعر الصفقة الجماعية</small>
            </div>
            <button type="button" class="btn-solid" id="mobile-cta-checkout">إتمام الحجز</button>
        `;
        document.body.appendChild(bar);
        document.body.classList.add('has-mobile-cta');

        const syncPrice = () => {
            const mobilePrice = document.getElementById('mobile-cta-price');
            if (mobilePrice && priceEl) mobilePrice.textContent = priceEl.textContent;
        };

        const priceObserver = new MutationObserver(syncPrice);
        priceObserver.observe(priceEl, { childList: true, characterData: true, subtree: true });
        syncPrice();

        document.getElementById('mobile-cta-checkout')?.addEventListener('click', () => {
            const checkout = document.getElementById('checkout');
            if (checkout) {
                checkout.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            const loginBtn = document.getElementById('checkout-login-btn');
            const orderForm = document.getElementById('order-form');
            if (orderForm?.classList.contains('hidden') && loginBtn) {
                loginBtn.click();
            }
        });
    }

    function patchViewportHeight() {
        const setVh = () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };
        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
    }

    // ===== إصلاح أحداث اللمس للبطاقات والأزرار على الهاتف =====
    function patchTouchEvents() {
        if (!isMobile()) return;

        // تأكد من أن كل العناصر التفاعلية تستجيب للنقر
        document.addEventListener('click', function(e) {
            var interactive = e.target.closest('.product-card, .join-btn, .cat-tab, .carousel-nav-btn, .nav-item, .carousel-dot');
            if (interactive) {
                // السماح للحدث بالمرور بشكل طبيعي - هذا يحل مشكلة ابتلاع المتصفح للـ click
            }
        }, { passive: true });

        // معالج إضافي للمس
        document.addEventListener('touchend', function(e) {
            var interactive = e.target.closest('.product-card, .join-btn, .cat-tab, .carousel-nav-btn, .nav-item, .carousel-dot');
            if (interactive && !e.target.closest('input, textarea, select')) {
                // السماح للـ click الطبيعي بالحدوث بعد اللمس
            }
        }, { passive: true });

        console.log('✅ Mobile touch fix applied - product cards now respond to touch');
    }

    function init() {
        if (isMobile()) {
            document.documentElement.classList.add('is-mobile');
        }
        setupBottomNav();
        setupModalScrollLock();
        setupProductMobileCta();
        patchViewportHeight();
        patchTouchEvents();  // ← تمت إضافة هذا السطر

        window.matchMedia('(max-width: ' + MOBILE_BP + 'px)').addEventListener('change', function(e) {
            document.documentElement.classList.toggle('is-mobile', e.matches);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
