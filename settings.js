/**
 * LodeaLode.dz — Settings Page Logic (v2)
 * Handles: profile, password, notifications, privacy, app prefs, account deletion
 */
(function () {
    'use strict';

    const SETTINGS_KEY = 'lodea_user_settings';

    // ─── Toast ───
    let toastTimer = null;
    function showToast(message, type = 'success') {
        let toast = document.getElementById('settings-toast');
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.className = 's-toast ' + type;
        toast.textContent = message;
        requestAnimationFrame(() => toast.classList.add('show'));
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // ─── LocalStorage helpers ───
    function loadLocal() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
        catch(e) { return {}; }
    }

    function saveLocal(obj) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadLocal(), ...obj }));
        } catch(e) {}
    }

    async function savePref(key, value) {
        saveLocal({ [key]: value });
        try {
            const client = LodeaAuth.getSupabaseClient();
            if (client) await client.auth.updateUser({ data: { [key]: value } });
        } catch(e) {}
    }

    // ─── Set helpers ───
    function setCheck(id, val) {
        const el = document.getElementById(id);
        if (el) el.checked = val;
    }
    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    // ─── Apply local settings ───
    function applyLocal() {
        const s = loadLocal();
        setCheck('notif_marketing', s.notif_marketing !== false);
        setCheck('notif_orders',    s.notif_orders    !== false);
        setCheck('notif_offers',    s.notif_offers    !== false);
        setVal('privacy_profile',   s.privacy_profile   || 'all');
        setVal('privacy_messages',  s.privacy_messages  || 'all');
        setCheck('privacy_activity',s.privacy_activity  !== false);
        setCheck('app_dark_mode',   localStorage.getItem('theme') === 'dark');
        setCheck('app_data_saver',  s.app_data_saver === true);
    }

    // ─── Wire auto-save toggles ───
    function setupAutoSave() {
        ['notif_marketing','notif_orders','notif_offers'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', async () => {
                await savePref(id, el.checked);
                showToast('تم حفظ إعدادات الإشعارات ✅');
            });
        });

        ['privacy_profile','privacy_messages'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', async () => {
                await savePref(id, el.value);
                showToast('تم حفظ إعدادات الخصوصية ✅');
            });
        });

        const actEl = document.getElementById('privacy_activity');
        if (actEl) actEl.addEventListener('change', async () => {
            await savePref('privacy_activity', actEl.checked);
            showToast('تم حفظ إعدادات الخصوصية ✅');
        });

        // Dark mode
        const dmEl = document.getElementById('app_dark_mode');
        if (dmEl) dmEl.addEventListener('change', async () => {
            if (dmEl.checked) {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
            await savePref('app_dark_mode', dmEl.checked);
            showToast(dmEl.checked ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري');
        });

        // Data saver
        const dsEl = document.getElementById('app_data_saver');
        if (dsEl) dsEl.addEventListener('change', async () => {
            await savePref('app_data_saver', dsEl.checked);
            showToast(dsEl.checked ? 'تم تفعيل توفير البيانات ✅' : 'تم إيقاف توفير البيانات');
        });
    }

    // ─── Load user profile from Supabase ───
    async function loadProfile() {
        try {
            const session = await LodeaAuth.getSessionSafe();
            if (!session || !session.user) {
                window.location.href = 'login.html';
                return;
            }

            const user  = session.user;
            const email = user.email || '';
            const meta  = user.user_metadata || {};
            const name  = meta.full_name || meta.name || email.split('@')[0];
            const phone = meta.phone || '';

            // Fill form
            setVal('full_name', name);
            setVal('email',     email);
            setVal('phone',     phone);

            // Avatar / header
            const avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff&size=96&bold=true`;
            const avatarImg = document.getElementById('settings-avatar-img');
            if (avatarImg) avatarImg.src = avatarSrc;

            const hdrAvatar = document.getElementById('hdr-avatar');
            const hdrName   = document.getElementById('hdr-name');
            const dispName  = document.getElementById('avatar-display-name');
            const dispEmail = document.getElementById('avatar-display-email');

            if (hdrAvatar) hdrAvatar.textContent = name.charAt(0).toUpperCase();
            if (hdrName)   hdrName.textContent   = name;
            if (dispName)  dispName.textContent  = name;
            if (dispEmail) dispEmail.textContent = email;

            // Merge prefs from metadata
            const s = loadLocal();
            const nm = meta.notif_marketing !== undefined ? meta.notif_marketing : s.notif_marketing !== false;
            const no = meta.notif_orders    !== undefined ? meta.notif_orders    : s.notif_orders    !== false;
            const nf = meta.notif_offers    !== undefined ? meta.notif_offers    : s.notif_offers    !== false;
            const pp = meta.privacy_profile  || s.privacy_profile  || 'all';
            const pm = meta.privacy_messages || s.privacy_messages || 'all';
            const pa = meta.privacy_activity !== undefined ? meta.privacy_activity : s.privacy_activity !== false;
            const ds = meta.app_data_saver   !== undefined ? meta.app_data_saver   : s.app_data_saver === true;

            setCheck('notif_marketing',  nm);
            setCheck('notif_orders',     no);
            setCheck('notif_offers',     nf);
            setVal('privacy_profile',    pp);
            setVal('privacy_messages',   pm);
            setCheck('privacy_activity', pa);
            setCheck('app_data_saver',   ds);

            saveLocal({ notif_marketing: nm, notif_orders: no, notif_offers: nf,
                        privacy_profile: pp, privacy_messages: pm, privacy_activity: pa,
                        app_data_saver: ds });

            // Also try profiles table
            const client = LodeaAuth.getSupabaseClient();
            if (client) {
                try {
                    const { data: profile, error } = await client
                        .from('profiles').select('*').eq('id', user.id).single();
                    if (!error && profile) {
                        if (profile.full_name) {
                            setVal('full_name', profile.full_name);
                            const n2 = profile.full_name;
                            if (hdrAvatar) hdrAvatar.textContent = n2.charAt(0).toUpperCase();
                            if (hdrName)   hdrName.textContent   = n2;
                            if (dispName)  dispName.textContent  = n2;
                            if (avatarImg) avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n2)}&background=6D28D9&color=fff&size=96&bold=true`;
                        }
                        if (profile.phone) setVal('phone', profile.phone);
                    }
                } catch(e) {}
            }

        } catch(err) {
            console.error('loadProfile error:', err);
        }
    }

    // ─── Save personal info ───
    async function savePersonalInfo(e) {
        e.preventDefault();
        const btn   = document.getElementById('save-personal-btn');
        const name  = document.getElementById('full_name')?.value?.trim();
        const phone = document.getElementById('phone')?.value?.trim();

        if (!name) { showToast('يرجى إدخال الاسم الكامل', 'error'); return; }

        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }

        try {
            const client = LodeaAuth.getSupabaseClient();
            if (!client) throw new Error('لا يمكن الاتصال بقاعدة البيانات');

            const { error } = await client.auth.updateUser({ data: { full_name: name, phone } });
            if (error) throw error;

            // Try profiles upsert
            try {
                const session = await LodeaAuth.getSessionSafe();
                if (session?.user) {
                    await client.from('profiles').upsert({
                        id: session.user.id,
                        email: session.user.email,
                        full_name: name,
                        phone,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                }
            } catch(e) {}

            // Update display
            const src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff&size=96&bold=true`;
            const avatarImg = document.getElementById('settings-avatar-img');
            if (avatarImg) avatarImg.src = src;

            const hdrAvatar = document.getElementById('hdr-avatar');
            const hdrName   = document.getElementById('hdr-name');
            const dispName  = document.getElementById('avatar-display-name');
            if (hdrAvatar) hdrAvatar.textContent = name.charAt(0).toUpperCase();
            if (hdrName)   hdrName.textContent   = name;
            if (dispName)  dispName.textContent  = name;

            showToast('تم حفظ المعلومات الشخصية بنجاح ✅');
        } catch(err) {
            showToast('خطأ: ' + (err.message || 'حدث خطأ غير معروف'), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات'; }
        }
    }

    // ─── Update password ───
    async function updatePassword(e) {
        e.preventDefault();
        const btn      = document.getElementById('update-password-btn');
        const newPass  = document.getElementById('new_password')?.value;
        const confPass = document.getElementById('confirm_password')?.value;

        if (!newPass || newPass.length < 6) {
            showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }
        if (newPass !== confPass) {
            showToast('كلمتا المرور غير متطابقتين', 'error');
            return;
        }

        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...'; }

        try {
            const client = LodeaAuth.getSupabaseClient();
            if (!client) throw new Error('لا يمكن الاتصال بقاعدة البيانات');

            const { error } = await client.auth.updateUser({ password: newPass });
            if (error) throw error;

            document.getElementById('new_password').value     = '';
            document.getElementById('confirm_password').value = '';
            showToast('تم تحديث كلمة المرور بنجاح ✅');
        } catch(err) {
            showToast('خطأ: ' + (err.message || 'حدث خطأ'), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-key"></i> تحديث كلمة المرور'; }
        }
    }

    // ─── Delete account ───
    function setupDeleteAccount() {
        const btn = document.getElementById('delete-account-btn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            if (!confirm('⚠️ هل أنت متأكد أنك تريد حذف حسابك نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) return;
            if (!confirm('⚠️ تأكيد أخير: سيتم حذف جميع بياناتك بشكل نهائي. متأكد تماماً؟')) return;

            try {
                await LodeaAuth.signOut();
                localStorage.removeItem(SETTINGS_KEY);
                localStorage.removeItem('theme');
                showToast('تم تسجيل الخروج. للحذف النهائي تواصل مع الدعم.');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            } catch(err) {
                showToast('حدث خطأ أثناء العملية', 'error');
            }
        });
    }

    // ─── Init ───
    function init() {
        applyLocal();
        setupAutoSave();
        setupDeleteAccount();
        loadProfile();

        document.getElementById('personal-info-form')
            ?.addEventListener('submit', savePersonalInfo);
        document.getElementById('password-form')
            ?.addEventListener('submit', updatePassword);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
