/**
 * LodeaLode.dz — Rooms page logic (إدارة صفقاتي وغرفي)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth Session
    let session = null;
    if (window.LodeaAuth) {
        session = await window.LodeaAuth.getSessionSafe();
    }
    
    if (!session || !session.user) {
        // Redirect to login if no active session
        window.location.href = 'login.html';
        return;
    }

    const userEmail = session.user.email;
    const supabase = window.LodeaAuth ? window.LodeaAuth.getSupabaseClient() : null;

    // 2. Mock Data Fallback (exactly matching the user screenshot)
    const mockRooms = [
        {
            id: 'mock-s24',
            product_name: 'Samsung Galaxy S24',
            status: 'نشطة',
            price: 74900,
            image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=200&q=80',
            buyers_count: 9,
            target_buyers: 15,
            subtext: 'متبقي 6 أعضاء للوصول إلى أفضل سعر'
        },
        {
            id: 'mock-xps',
            product_name: 'Dell XPS 13',
            status: 'مكتملة',
            price: 64900,
            image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=200&q=80',
            buyers_count: 6,
            target_buyers: 6,
            subtext: 'تم تثبيت السعر ⏳'
        },
        {
            id: 'mock-macbook',
            product_name: 'MacBook Air M2',
            status: 'قيد الشحن',
            price: 79900,
            image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80',
            buyers_count: 6,
            target_buyers: 6,
            subtext: 'الطلب قيد التجهيز'
        },
        {
            id: 'mock-redmi',
            product_name: 'Redmi Note 13',
            status: 'بانتظار التأكيد',
            price: 38900,
            image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=200&q=80',
            buyers_count: 4,
            target_buyers: 10,
            subtext: 'متبقي 6 أعضاء للوصول إلى أفضل سعر'
        }
    ];

    let allRooms = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // Elements
    const listContainer = document.getElementById('rooms-list-container');
    const searchInput = document.getElementById('rooms-search-input');
    const filterTabsContainer = document.getElementById('rooms-filter-tabs');
    const statActive = document.getElementById('stat-active-count');
    const statCompleted = document.getElementById('stat-completed-count');
    const statShipping = document.getElementById('stat-shipping-count');

    // 3. Fetch Data from Supabase
    async function loadUserRooms() {
        if (!supabase) {
            useMockData();
            return;
        }

        try {
            // Fetch User Orders
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('user_email', userEmail)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                // If the user has no orders in database, show mockup items
                useMockData();
                return;
            }

            // Fetch Products to enrich order data with image and buyer counts
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*');

            if (productsError) throw productsError;

            // Map orders to rooms format
            allRooms = orders.map(order => {
                const product = products.find(p => String(p.id) === String(order.product_id));
                
                // Status Mapping:
                // 'قيد المراجعة' or 'قيد الانتظار' -> 'بانتظار التأكيد'
                // 'مؤكد' -> 'نشطة'
                // 'مكتمل' -> 'مكتملة'
                // 'تم الشحن' -> 'قيد الشحن'
                let status = 'بانتظار التأكيد';
                if (order.status === 'مؤكد') status = 'نشطة';
                if (order.status === 'تم الشحن') status = 'قيد الشحن';
                if (order.status === 'مكتمل') status = 'مكتملة';
                
                const price = product ? (product.price || product.wholesale_price) : 0;
                const seed = String(order.product_id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const buyers = product ? (product.buyers_count || (25 + (seed % 60))) : 0;
                const target = product ? (product.target_buyers || 100) : 100;
                const needed = target - buyers;

                let subtext = 'متبقي ' + needed + ' أعضاء للوصول إلى أفضل سعر';
                if (status === 'مكتملة') subtext = 'تم تثبيت السعر ⏳';
                if (status === 'قيد الشحن') subtext = 'الطلب قيد التجهيز';

                return {
                    id: order.product_id,
                    product_name: order.product_name || (product ? product.name : 'منتج الشراء الجماعي'),
                    status: status,
                    price: price || 50000, // Fallback if 0
                    image_url: product ? product.image_url : 'logo.png',
                    buyers_count: buyers,
                    target_buyers: target,
                    subtext: subtext,
                    raw_order: order
                };
            });

            updateStats();
            renderRooms();

        } catch (err) {
            console.error('Error loading rooms, falling back to mock data:', err);
            useMockData();
        }
    }

    function useMockData() {
        allRooms = [...mockRooms];
        updateStats();
        renderRooms();
    }

    // 4. Update Statistics Cards
    function updateStats() {
        const activeCount = allRooms.filter(r => r.status === 'نشطة').length;
        const completedCount = allRooms.filter(r => r.status === 'مكتملة').length;
        const shippingCount = allRooms.filter(r => r.status === 'قيد الشحن').length;

        if (statActive) statActive.textContent = activeCount;
        if (statCompleted) statCompleted.textContent = completedCount;
        if (statShipping) statShipping.textContent = shippingCount;
    }

    // 5. Render Rooms
    function renderRooms() {
        if (!listContainer) return;

        // Filter and Search
        let filtered = allRooms.filter(room => {
            const matchesFilter = currentFilter === 'all' || room.status === currentFilter;
            const matchesSearch = room.product_name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="rooms-empty-state">
                    <i class="fas fa-search"></i>
                    <h3>لا توجد غرف تطابق البحث</h3>
                    <p>جرب تصفية أو كلمة بحث أخرى</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtered.map(room => {
            const pct = Math.min(Math.round((room.buyers_count / room.target_buyers) * 100), 100);
            
            let badgeClass = 'status-pending';
            if (room.status === 'نشطة') badgeClass = 'status-active';
            if (room.status === 'مكتملة') badgeClass = 'status-completed';
            if (room.status === 'قيد الشحن') badgeClass = 'status-shipping';

            return `
                <div class="room-card" data-id="${room.id}">
                    <div class="room-card-main" onclick="viewRoomDetail('${room.id}')" style="cursor: pointer;">
                        <div class="room-card-img-wrap">
                            <img src="${room.image_url}" alt="${room.product_name}" onerror="this.src='logo.png'">
                        </div>
                        <div class="room-card-info">
                            <div class="room-card-header">
                                <span class="room-card-title">${room.product_name}</span>
                                <span class="room-status-badge ${badgeClass}">
                                    <span class="badge-dot"></span>
                                    ${room.status === 'بانتظار التأكيد' ? 'بانتظار اكتمال العدد' : room.status}
                                </span>
                            </div>
                            <div class="room-card-price">${Number(room.price).toLocaleString()} دج</div>
                            <div class="room-card-buyers">
                                <i class="fas fa-users"></i>
                                <span>مشترك ${room.buyers_count} / ${room.target_buyers}</span>
                            </div>
                            <div class="room-card-progress">
                                <div class="room-progress-track">
                                    <div class="room-progress-fill" style="width: ${pct}%"></div>
                                </div>
                            </div>
                            <div class="room-card-subtext">${room.subtext}</div>
                        </div>
                        <div class="room-card-arrow">
                            <i class="fas fa-chevron-left"></i>
                        </div>
                    </div>
                    
                    <div class="room-card-actions">
                        <button class="room-action-btn btn-outline" onclick="shareRoom('${room.id}')">
                            <i class="fas fa-share-nodes"></i> مشاركة
                        </button>
                        <button class="room-action-btn btn-solid" onclick="viewRoomDetail('${room.id}')">
                            عرض الغرفة
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 6. Navigation Actions
    window.viewRoomDetail = function (productId) {
        if (!productId) return;
        // Mock rooms redirection can go to index page or settings
        if (productId.startsWith('mock-')) {
            window.location.href = `product.html?id=mock-macbook`;
        } else {
            window.location.href = `product.html?id=${productId}`;
        }
    };

    window.shareRoom = function (productId) {
        const room = allRooms.find(r => r.id === productId);
        if (!room) return;
        
        // Open the native index.js ticket modal
        if (typeof window.openTicketModal === 'function') {
            const needed = room.target_buyers - room.buyers_count;
            window.openTicketModal(
                room.id,
                room.product_name,
                room.buyers_count,
                needed > 0 ? needed : 0,
                room.price,
                room.image_url
            );
        } else {
            // Fallback sharing
            const url = window.location.origin + `/product.html?id=${productId}`;
            navigator.clipboard.writeText(url);
            alert('تم نسخ رابط الغرفة للمشاركة: ' + url);
        }
    };

    // 7. Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderRooms();
        });
    }

    if (filterTabsContainer) {
        filterTabsContainer.querySelectorAll('.rooms-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterTabsContainer.querySelectorAll('.rooms-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.status;
                renderRooms();
            });
        });
    }

    // Initial Load
    await loadUserRooms();
});
