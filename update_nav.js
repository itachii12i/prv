const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/Administrator/Desktop/New folder (2)';
const files = fs.readdirSync(directory).filter(f => f.endsWith('.html'));

const navTemplate = `    <!-- ===== MOBILE BOTTOM NAVIGATION ===== -->
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav">
        <a href="index.html" class="nav-item{home_active}" id="nav-home">
            <i class="fas fa-home nav-icon"></i>
            <span class="nav-label">الرئيسية</span>
        </a>
        <a href="rooms.html" class="nav-item{rooms_active}" id="nav-rooms">
            <i class="fas fa-shopping-cart nav-icon"></i>
            <span class="nav-label">غرفي</span>
        </a>
        <a href="community.html" class="nav-item{community_active}" id="nav-community">
            <i class="fas fa-comments nav-icon"></i>
            <span class="nav-label">المجتمع</span>
        </a>
        <a href="products.html" class="nav-item{products_active}" id="nav-products">
            <i class="fas fa-shopping-bag nav-icon"></i>
            <span class="nav-label">المنتجات</span>
        </a>
        <a href="settings.html" class="nav-item{settings_active}" id="nav-settings">
            <i class="far fa-user nav-icon"></i>
            <span class="nav-label">حسابي</span>
        </a>
    </nav>`;

files.forEach(f => {
    const filePath = path.join(directory, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove existing navs
    content = content.replace(/\s*<!-- ── BOTTOM NAV ── -->\s*<nav class="bottom-nav"[\s\S]*?<\/nav>/g, '');
    content = content.replace(/\s*<nav class="bottom-nav"[\s\S]*?<\/nav>/g, '');
    content = content.replace(/\s*<!-- ===== MOBILE BOTTOM NAVIGATION ===== -->\s*<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/g, '');
    content = content.replace(/\s*<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/g, '');
    
    if (!['login.html', 'register.html', 'admin.html', 'super-admin.html'].includes(f)) {
        const nav = navTemplate
            .replace('{home_active}', f === 'index.html' ? ' active' : '')
            .replace('{rooms_active}', f === 'rooms.html' ? ' active' : '')
            .replace('{community_active}', f === 'community.html' ? ' active' : '')
            .replace('{products_active}', f === 'products.html' || f === 'product.html' ? ' active' : '')
            .replace('{settings_active}', f === 'settings.html' ? ' active' : '');
            
        if (content.includes('</body>')) {
            content = content.replace('</body>', nav + '\n</body>');
        } else {
            content += '\n' + nav;
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Updated all HTML files.');
