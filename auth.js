/**
 * Shared Supabase auth — stable session across page navigations.
 */
(function () {
    const SUPABASE_URL = 'https://xhjyszxrnkqolrynsffi.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_vIx5AuAzJ_4BkFOx1E0gyg_Xf0B0e5C';
    const AUTH_STORAGE_KEY = 'sb-xhjyszxrnkqolrynsffi-auth-token';
    const LEGACY_AUTH_STORAGE_KEY = 'lodealode-auth';
    const SESSION_BACKUP_KEY = 'lodea_session_backup';

    const SUPABASE_AUTH_OPTIONS = {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: AUTH_STORAGE_KEY
        }
    };

    let supabaseSingleton = null;
    let authListenerAttached = false;
    let signOutRequested = false;

    function migrateAuthStorageIfNeeded() {
        try {
            if (!localStorage.getItem(AUTH_STORAGE_KEY) && localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)) {
                localStorage.setItem(AUTH_STORAGE_KEY, localStorage.getItem(LEGACY_AUTH_STORAGE_KEY));
            }
        } catch (err) {
            console.warn('Auth storage migration skipped:', err);
        }
    }

    function saveSessionBackup(session) {
        if (!session?.user) return;
        try {
            localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify({
                email: session.user.email,
                id: session.user.id,
                access_token: session.access_token || null,
                refresh_token: session.refresh_token || null,
                saved_at: Date.now()
            }));
        } catch (err) {
            console.warn('saveSessionBackup failed:', err);
        }
    }

    function readSessionBackup() {
        try {
            const raw = localStorage.getItem(SESSION_BACKUP_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (err) {
            return null;
        }
    }

    function clearSessionBackup() {
        try {
            localStorage.removeItem(SESSION_BACKUP_KEY);
        } catch (err) { /* ignore */ }
    }

    function backupToSession(backup) {
        if (!backup?.email) return null;
        return {
            access_token: backup.access_token,
            refresh_token: backup.refresh_token,
            user: { email: backup.email, id: backup.id || backup.email }
        };
    }

    function readStoredSession() {
        try {
            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data?.access_token || !data?.user) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

    function attachAuthListener(client) {
        if (!client || authListenerAttached) return;
        authListenerAttached = true;

        client.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                saveSessionBackup(session);
            }

            if (event === 'SIGNED_OUT' && !signOutRequested) {
                const backup = readSessionBackup();
                if (backup?.email) {
                    window.dispatchEvent(new CustomEvent('lodea-auth', {
                        detail: {
                            event: 'BACKUP_SESSION',
                            session: backupToSession(backup)
                        }
                    }));
                    return;
                }
                return;
            }

            if (event === 'SIGNED_OUT' && signOutRequested) {
                signOutRequested = false;
                clearSessionBackup();
            }

            window.dispatchEvent(new CustomEvent('lodea-auth', {
                detail: { event, session: session?.user ? session : null }
            }));
        });
    }

    function getSupabaseClient() {
        if (!window.supabase) return null;
        if (!supabaseSingleton) {
            migrateAuthStorageIfNeeded();
            supabaseSingleton = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                SUPABASE_AUTH_OPTIONS
            );
            attachAuthListener(supabaseSingleton);
        }
        return supabaseSingleton;
    }

    async function tryRestoreWithTokens(client, tokens) {
        if (!tokens?.access_token || !tokens?.refresh_token) return null;
        const { data, error } = await client.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
        });
        if (error || !data?.session?.user) return null;
        saveSessionBackup(data.session);
        return data.session;
    }

    async function getSessionSafe() {
        const client = getSupabaseClient();
        const backup = readSessionBackup();

        if (client) {
            for (let i = 0; i < 5; i++) {
                try {
                    const { data: { session } } = await client.auth.getSession();
                    if (session?.user) {
                        saveSessionBackup(session);
                        return session;
                    }
                } catch (err) {
                    console.warn('getSession failed:', err);
                }
                if (i < 4) await new Promise((r) => setTimeout(r, 100 * (i + 1)));
            }

            const stored = readStoredSession();
            if (stored?.access_token && stored?.refresh_token) {
                const restored = await tryRestoreWithTokens(client, stored);
                if (restored) return restored;
            }

            if (backup?.access_token && backup?.refresh_token) {
                const restored = await tryRestoreWithTokens(client, backup);
                if (restored) return restored;
            }
        }

        if (backup?.email) return backupToSession(backup);

        const stored = readStoredSession();
        if (stored?.user) return stored;

        return null;
    }

    function waitForAuthSession(maxWaitMs = 5000) {
        return getSessionSafe().then((session) => {
            if (session?.user) return session;
            return new Promise((resolve) => {
                let done = false;
                const finish = (session) => {
                    if (done) return;
                    done = true;
                    window.removeEventListener('lodea-auth', onAuth);
                    clearTimeout(timer);
                    resolve(session?.user ? session : null);
                };

                const onAuth = (e) => {
                    const { session } = e.detail || {};
                    if (session?.user) finish(session);
                };

                window.addEventListener('lodea-auth', onAuth);
                const timer = setTimeout(() => getSessionSafe().then(finish), maxWaitMs);
            });
        });
    }

    async function persistAuthSession(session) {
        const client = getSupabaseClient();
        if (!client || !session?.access_token || !session?.refresh_token) {
            if (session?.user) saveSessionBackup(session);
            return session;
        }
        const { data, error } = await client.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
        });
        const finalSession = (!error && data?.session) ? data.session : session;
        if (finalSession?.user) saveSessionBackup(finalSession);
        return finalSession;
    }

    function markSignOutRequested() {
        signOutRequested = true;
    }

    async function signOut() {
        markSignOutRequested();
        clearSessionBackup();
        const client = getSupabaseClient();
        if (client) await client.auth.signOut();
    }

    window.LodeaAuth = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        AUTH_STORAGE_KEY,
        getSupabaseClient,
        getSessionSafe,
        waitForAuthSession,
        persistAuthSession,
        readStoredSession,
        readSessionBackup,
        saveSessionBackup,
        clearSessionBackup,
        markSignOutRequested,
        signOut,
        migrateAuthStorageIfNeeded
    };
})();
