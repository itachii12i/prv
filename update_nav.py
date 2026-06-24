import os
import re

directory = 'c:/Users/Administrator/Desktop/New folder (2)'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

nav_html_template = '''    <!-- ===== MOBILE BOTTOM NAVIGATION ===== -->
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
    </nav>'''

for f in files:
    path = os.path.join(directory, f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove existing nav
    content = re.sub(r'\s*<!-- ── BOTTOM NAV ── -->\s*<nav class="bottom-nav"[^>]*>.*?</nav>', '', content, flags=re.DOTALL)
    content = re.sub(r'\s*<nav class="bottom-nav"[^>]*>.*?</nav>', '', content, flags=re.DOTALL)
    content = re.sub(r'\s*<!-- ===== MOBILE BOTTOM NAVIGATION ===== -->\s*<nav class="mobile-bottom-nav"[^>]*>.*?</nav>', '', content, flags=re.DOTALL)
    content = re.sub(r'\s*<nav class="mobile-bottom-nav"[^>]*>.*?</nav>', '', content, flags=re.DOTALL)
    
    if f not in ['login.html', 'register.html', 'admin.html', 'super-admin.html']:
        # Determine active state
        home_act = ' active' if f == 'index.html' else ''
        rooms_act = ' active' if f == 'rooms.html' else ''
        community_act = ' active' if f == 'community.html' else ''
        products_act = ' active' if f == 'products.html' else ''
        settings_act = ' active' if f == 'settings.html' else ''
        
        nav = nav_html_template.format(
            home_active=home_act,
            rooms_active=rooms_act,
            community_active=community_act,
            products_active=products_act,
            settings_active=settings_act
        )
        
        # Insert before </body>
        if '</body>' in content:
            content = content.replace('</body>', nav + '\n</body>')
        else:
            content += '\n' + nav
            
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)

print('Updated all HTML files.')

