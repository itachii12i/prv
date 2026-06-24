const SUPABASE_URL = 'https://xhjyszxrnkqolrynsffi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vIx5AuAzJ_4BkFOx1E0gyg_Xf0B0e5C';
const SUPER_ADMIN_EMAILS = ['ahmedmalekmohamedelamine@gmail.com'];

// Initialize Supabase
const supabaseClient = window.LodeaAuth?.getSupabaseClient?.() || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const addAdminForm = document.getElementById('add-admin-form');
const newAdminEmailInput = document.getElementById('new-admin-email');
const adminStaffList = document.getElementById('admin-staff-list');
const adminMsg = document.getElementById('admin-msg');

document.addEventListener('DOMContentLoaded', () => {
    checkSuperAdminAccess();
});

async function checkSuperAdminAccess() {
    let session = null;
    try {
        if (window.LodeaAuth?.getSessionSafe) {
            session = await window.LodeaAuth.getSessionSafe();
        } else {
            const { data } = await supabaseClient.auth.getSession();
            session = data?.session;
        }
    } catch (e) {
        console.error('Session retrieval error in super-admin access check:', e);
    }
    
    if (!session) {
        showAccessDenied();
        return;
    }

    const email = session.user.email;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if the email is in the SUPER_ADMIN_EMAILS list
    if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) {
        showAdminContent();
    } else {
        showAccessDenied();
    }
}

function showAccessDenied() {
    if (adminContent) adminContent.style.display = 'none';
    if (accessDenied) accessDenied.style.display = 'flex';
}

function showAdminContent() {
    if (accessDenied) accessDenied.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';

    // Event Listeners
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            if (window.LodeaAuth?.signOut) {
                await window.LodeaAuth.signOut();
            } else {
                await supabaseClient.auth.signOut();
            }
            window.location.href = 'index.html';
        });
    }

    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addAdmin();
        });
    }

    // Load Data
    loadAdminStaff();
}

// Show specific messages
function showAdminMsg(msg, isError = false) {
    if (!adminMsg) return;
    adminMsg.textContent = msg;
    adminMsg.classList.remove('hidden');
    adminMsg.style.display = 'block';
    if (isError) {
        adminMsg.style.backgroundColor = 'rgba(248, 113, 113, 0.1)';
        adminMsg.style.color = '#F87171';
        adminMsg.style.borderColor = '#F87171';
    } else {
        adminMsg.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        adminMsg.style.color = '#10B981';
        adminMsg.style.borderColor = '#10B981';
    }
    
    setTimeout(() => {
        adminMsg.style.display = 'none';
    }, 4000);
}

// Function to load admins
async function loadAdminStaff() {
    if (!adminStaffList) return;
    
    try {
        const { data: admins, error } = await supabaseClient
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (admins && admins.length > 0) {
            adminStaffList.innerHTML = admins.map(admin => {
                const date = admin.created_at ? new Date(admin.created_at).toLocaleDateString('ar-DZ') : 'غير معروف';
                
                return `
                    <tr>
                        <td dir="ltr" style="text-align: right; color: #fff;"><strong>${admin.email}</strong></td>
                        <td style="color: #94A3B8;">${date}</td>
                        <td>
                            <button onclick="removeAdmin('${admin.id}')" style="background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;">إزالة الصلاحية</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            adminStaffList.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem;">لا يوجد إداريين حالياً.</td></tr>`;
        }
    } catch (err) {
        console.error('Error fetching admin staff:', err);
        adminStaffList.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #F87171; padding: 3rem;">حدث خطأ أثناء جلب قائمة الإداريين.</td></tr>`;
    }
}

async function addAdmin() {
    const email = newAdminEmailInput.value.trim().toLowerCase();
    
    if (!email) {
        showAdminMsg('الرجاء إدخال البريد الإلكتروني.', true);
        return;
    }

    try {
        // Check if admin already exists
        const { data: existingAdmin, error: searchError } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('email', email);
            
        if (searchError) throw searchError;

        if (existingAdmin && existingAdmin.length > 0) {
            showAdminMsg('هذا الموظف لديه صلاحية إدارية بالفعل.', true);
            return;
        }

        // Add admin
        const { error } = await supabaseClient
            .from('admins')
            .insert([{ email: email }]);

        if (error) throw error;
        
        showAdminMsg('تم منح الصلاحية الإدارية بنجاح!');
        addAdminForm.reset();
        loadAdminStaff();
    } catch (err) {
        showAdminMsg('حدث خطأ: ' + err.message, true);
    }
}

// Function to delete admin (Needs to be exposed to window since it's used in inline HTML)
window.removeAdmin = async function(id) {
    if(!confirm('هل أنت متأكد من رغبتك في إزالة الصلاحية الإدارية عن هذا الموظف؟')) return;

    try {
        const { error } = await supabaseClient
            .from('admins')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        showAdminMsg('تم إزالة الصلاحية الإدارية بنجاح.');
        loadAdminStaff();
    } catch (err) {
        showAdminMsg('حدث خطأ أثناء الإزالة: ' + err.message, true);
    }
}
