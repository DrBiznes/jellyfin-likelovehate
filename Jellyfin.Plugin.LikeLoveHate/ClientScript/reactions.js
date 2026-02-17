(function () {
    'use strict';



    // Load Google Material Symbols font (filled variant for active states)
    var materialLink = document.createElement('link');
    materialLink.rel = 'stylesheet';
    materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0';
    document.head.appendChild(materialLink);

    // Reaction definitions (colors updated from server config)
    var REACTIONS = {
        1: { name: 'Like', icon: 'thumb_up', color: '#4fc3f7' },
        2: { name: 'Love', icon: 'thumb_up', color: '#e040fb', double: true },
        3: { name: 'Hate', icon: 'thumb_down', color: '#ef5350' }
    };

    // Shared state
    var currentItemId = null;
    var currentReaction = 0;
    var isInjecting = false;
    var colorsLoaded = false;

    // Track all synced button sets
    var headerButtons = {};   // { 1: element, 2: element, 3: element }
    var osdButtons = {};      // { 1: element, 2: element, 3: element }
    var panelButtons = {};    // { 1: { btn, count }, 2: ..., 3: ... }

    // Fetch configured colors from server
    async function fetchColors() {
        if (colorsLoaded) return;
        try {
            var response = await fetch(ApiClient.getUrl('LikeLoveHate/Colors'), {
                headers: { 'X-Emby-Token': ApiClient.accessToken() }
            });
            var colors = await response.json();
            if (colors.likeColor) REACTIONS[1].color = colors.likeColor;
            if (colors.loveColor) REACTIONS[2].color = colors.loveColor;
            if (colors.hateColor) REACTIONS[3].color = colors.hateColor;
            colorsLoaded = true;
        } catch (error) {

            colorsLoaded = true;
        }
    }

    // ─── CSS ───────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
        /* ── Detail page header icon buttons ─────────────────── */
        '.llh-header-btn {',
        '    position: relative;',
        '    transition: all 0.2s ease;',
        '}',
        '.llh-header-btn .detailButton-icon {',
        '    transition: color 0.2s ease;',
        '}',
        '.llh-header-btn.llh-active .detailButton-icon {',
        '    color: var(--llh-color) !important;',
        '}',
        '.llh-header-btn:hover .detailButton-icon {',
        '    color: var(--llh-color) !important;',
        '    opacity: 0.8;',
        '}',
        /* Love double-icon for header */
        '.llh-header-love {',
        '    display: inline-flex;',
        '    position: relative;',
        '    width: 24px;',
        '    height: 24px;',
        '}',
        '.llh-header-love .detailButton-icon {',
        '    font-size: 18px !important;',
        '    position: absolute !important;',
        '}',
        '.llh-header-love .detailButton-icon:first-child {',
        '    top: 3px;',
        '    left: -2px;',
        '}',
        '.llh-header-love .detailButton-icon:last-child {',
        '    top: -1px;',
        '    left: 5px;',
        '}',

        /* ── Video player OSD icon buttons ───────────────────── */
        '.llh-osd-btn {',
        '    transition: all 0.2s ease;',
        '}',
        '.llh-osd-btn .material-icons {',
        '    transition: color 0.2s ease;',
        '}',
        '.llh-osd-btn.llh-active .material-icons {',
        '    color: var(--llh-color) !important;',
        '}',
        '.llh-osd-btn:hover .material-icons {',
        '    color: var(--llh-color) !important;',
        '    opacity: 0.85;',
        '}',
        /* Love double-icon for OSD */
        '.llh-osd-love {',
        '    display: inline-flex;',
        '    position: relative;',
        '    width: 30px;',
        '    height: 30px;',
        '}',
        '.llh-osd-love .material-icons {',
        '    font-size: 22px !important;',
        '    position: absolute !important;',
        '}',
        '.llh-osd-love .material-icons:first-child {',
        '    top: 6px;',
        '    left: 0;',
        '}',
        '.llh-osd-love .material-icons:last-child {',
        '    top: 1px;',
        '    left: 7px;',
        '}',

        /* ── Detail panel ────────────────────────────────────── */
        '.llh-container {',
        '    background: rgba(0, 0, 0, 0.15);',
        '    backdrop-filter: blur(10px);',
        '    border-radius: 10px;',
        '    padding: 1.5em 2em;',
        '    margin-top: 2em;',
        '    margin-bottom: 2em;',
        '    border: 1px solid rgba(255, 255, 255, 0.08);',
        '    box-sizing: border-box;',
        '}',
        '.llh-container * { box-sizing: border-box; }',
        '.llh-header {',
        '    font-size: 1.3em;',
        '    font-weight: 500;',
        '    margin-bottom: 1em;',
        '    color: #ffffff;',
        '    display: flex;',
        '    align-items: center;',
        '    gap: 0.5em;',
        '}',
        '.llh-buttons {',
        '    display: flex;',
        '    gap: 0.75em;',
        '    flex-wrap: wrap;',
        '    margin-bottom: 1em;',
        '}',
        '.llh-btn {',
        '    display: inline-flex;',
        '    align-items: center;',
        '    gap: 0.5em;',
        '    padding: 0.6em 1.2em;',
        '    border-radius: 8px;',
        '    border: 2px solid rgba(255, 255, 255, 0.15);',
        '    background: rgba(255, 255, 255, 0.05);',
        '    color: rgba(255, 255, 255, 0.7);',
        '    cursor: pointer;',
        '    transition: all 0.2s ease;',
        '    font-family: inherit;',
        '    font-size: 0.95em;',
        '    font-weight: 500;',
        '    user-select: none;',
        '    outline: none;',
        '}',
        '.llh-btn:hover {',
        '    background: rgba(255, 255, 255, 0.1);',
        '    border-color: rgba(255, 255, 255, 0.3);',
        '    transform: translateY(-1px);',
        '}',
        '.llh-btn:active {',
        '    transform: translateY(0);',
        '}',
        '.llh-btn.active {',
        '    border-color: var(--llh-color);',
        '    background: color-mix(in srgb, var(--llh-color) 15%, transparent);',
        '    color: var(--llh-color);',
        '}',
        '.llh-btn .material-symbols-outlined {',
        '    font-size: 1.3em;',
        '    transition: color 0.2s;',
        '}',
        '.llh-btn.active .material-symbols-outlined {',
        '    color: var(--llh-color);',
        '}',
        '.llh-btn .llh-count {',
        '    font-size: 0.9em;',
        '    opacity: 0.7;',
        '}',
        '.llh-btn.active .llh-count {',
        '    opacity: 1;',
        '}',
        '.llh-love-icon {',
        '    display: inline-flex;',
        '    position: relative;',
        '    width: 1.3em;',
        '    height: 1.3em;',
        '}',
        '.llh-love-icon .material-symbols-outlined {',
        '    font-size: 1.1em !important;',
        '    position: absolute;',
        '}',
        '.llh-love-icon .material-symbols-outlined:first-child {',
        '    top: 2px;',
        '    left: 0;',
        '}',
        '.llh-love-icon .material-symbols-outlined:last-child {',
        '    top: -2px;',
        '    left: 5px;',
        '}',
        '.llh-reactions-list {',
        '    margin-top: 1em;',
        '    padding-top: 1em;',
        '    border-top: 1px solid rgba(255, 255, 255, 0.08);',
        '}',
        '.llh-reactions-title {',
        '    font-size: 1em;',
        '    font-weight: 600;',
        '    color: #ffffff;',
        '    margin-bottom: 0.75em;',
        '}',
        '.llh-reactions-grid {',
        '    display: flex;',
        '    flex-wrap: wrap;',
        '    gap: 0.4em;',
        '}',
        '.llh-reaction-chip {',
        '    display: inline-flex;',
        '    align-items: center;',
        '    gap: 0.4em;',
        '    padding: 0.3em 0.65em 0.3em 0.3em;',
        '    background: rgba(0, 0, 0, 0.18);',
        '    border-radius: 20px;',
        '    border: 1.5px solid var(--llh-chip-color, rgba(255, 255, 255, 0.1));',
        '    color: #ffffff;',
        '    font-size: 0.82em;',
        '    transition: background 0.15s ease;',
        '}',
        '.llh-reaction-chip:hover {',
        '    background: rgba(255, 255, 255, 0.06);',
        '}',
        '.llh-avatar {',
        '    width: 22px;',
        '    height: 22px;',
        '    border-radius: 50%;',
        '    object-fit: cover;',
        '    flex-shrink: 0;',
        '}',
        '.llh-avatar-fallback {',
        '    width: 22px;',
        '    height: 22px;',
        '    border-radius: 50%;',
        '    background: rgba(255, 255, 255, 0.12);',
        '    display: inline-flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    flex-shrink: 0;',
        '}',
        '.llh-avatar-fallback .material-symbols-outlined {',
        '    font-size: 14px;',
        '    color: rgba(255, 255, 255, 0.5);',
        '}',
        '.llh-chip-user {',
        '    font-weight: 500;',
        '    white-space: nowrap;',
        '}',
        '.llh-chip-icon .material-symbols-outlined {',
        '    font-size: 0.95em;',
        '}',
        '.llh-chip-label {',
        '    color: var(--llh-chip-color);',
        '    font-weight: 500;',
        '    white-space: nowrap;',
        '}',
        '.llh-chip-date {',
        '    font-size: 0.85em;',
        '    color: rgba(255, 255, 255, 0.4);',
        '    white-space: nowrap;',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // ─── Icon helpers ──────────────────────────────────────────────────────

    function createMaterialIcon(iconName) {
        var span = document.createElement('span');
        span.className = 'material-symbols-outlined';
        span.textContent = iconName;
        return span;
    }

    function createLoveIcon() {
        var container = document.createElement('span');
        container.className = 'llh-love-icon';
        container.appendChild(createMaterialIcon('thumb_up'));
        container.appendChild(createMaterialIcon('thumb_up'));
        return container;
    }

    function createReactionIcon(reactionType) {
        var def = REACTIONS[reactionType];
        if (!def) return document.createTextNode('');
        if (def.double) return createLoveIcon();
        return createMaterialIcon(def.icon);
    }

    // ─── API helpers ───────────────────────────────────────────────────────

    async function fetchReactions(itemId) {
        try {
            var response = await fetch(ApiClient.getUrl('LikeLoveHate/Item/' + itemId), {
                headers: { 'X-Emby-Token': ApiClient.accessToken() }
            });
            return await response.json();
        } catch (error) {
            console.error('[LikeLoveHate] Error loading reactions:', error);
            return { reactions: [], likes: 0, loves: 0, hates: 0, total: 0 };
        }
    }

    async function fetchMyReaction(itemId) {
        try {
            var userId = ApiClient.getCurrentUserId();
            var response = await fetch(ApiClient.getUrl('LikeLoveHate/MyReaction/' + itemId + '?userId=' + userId), {
                headers: { 'X-Emby-Token': ApiClient.accessToken() }
            });
            return await response.json();
        } catch (error) {
            console.error('[LikeLoveHate] Error loading my reaction:', error);
            return null;
        }
    }

    async function sendReaction(itemId, reactionType) {
        try {
            var userId = ApiClient.getCurrentUserId();
            var user = await ApiClient.getCurrentUser();
            var userName = user ? user.Name : 'Unknown';
            var url = ApiClient.getUrl(
                'LikeLoveHate/React?itemId=' + itemId +
                '&userId=' + userId +
                '&reaction=' + reactionType +
                '&userName=' + encodeURIComponent(userName)
            );
            var response = await fetch(url, {
                method: 'POST',
                headers: { 'X-Emby-Token': ApiClient.accessToken() }
            });
            return await response.json();
        } catch (error) {
            console.error('[LikeLoveHate] Error saving reaction:', error);
            return { success: false, message: error.message };
        }
    }

    async function removeReaction(itemId) {
        try {
            var userId = ApiClient.getCurrentUserId();
            var url = ApiClient.getUrl('LikeLoveHate/Reaction?itemId=' + itemId + '&userId=' + userId);
            var response = await fetch(url, {
                method: 'DELETE',
                headers: { 'X-Emby-Token': ApiClient.accessToken() }
            });
            return await response.json();
        } catch (error) {
            console.error('[LikeLoveHate] Error deleting reaction:', error);
            return { success: false, message: error.message };
        }
    }

    // ─── Reaction click handler (shared by all locations) ──────────────────

    async function handleReactionClick(itemId, type) {

        if (currentReaction === type) {
            await removeReaction(itemId);
            currentReaction = 0;
        } else {
            await sendReaction(itemId, type);
            currentReaction = type;
        }
        await refreshAllUI(itemId);
    }

    // ─── Sync all button states ────────────────────────────────────────────

    function syncButtonStates() {
        // Sync header buttons
        [1, 2, 3].forEach(function (type) {
            var btn = headerButtons[type];
            if (btn) {
                if (currentReaction === type) {
                    btn.classList.add('llh-active');
                } else {
                    btn.classList.remove('llh-active');
                }
            }
        });

        // Sync OSD buttons
        [1, 2, 3].forEach(function (type) {
            var btn = osdButtons[type];
            if (btn) {
                if (currentReaction === type) {
                    btn.classList.add('llh-active');
                } else {
                    btn.classList.remove('llh-active');
                }
            }
        });

        // Sync panel buttons
        [1, 2, 3].forEach(function (type) {
            var b = panelButtons[type];
            if (b && b.btn) {
                if (currentReaction === type) {
                    b.btn.classList.add('active');
                } else {
                    b.btn.classList.remove('active');
                }
            }
        });
    }

    async function refreshAllUI(itemId) {
        var data = await fetchReactions(itemId);
        var counts = { 1: data.likes || 0, 2: data.loves || 0, 3: data.hates || 0 };

        // Update panel button counts
        [1, 2, 3].forEach(function (type) {
            var b = panelButtons[type];
            if (b && b.count) {
                b.count.textContent = counts[type] > 0 ? counts[type] : '';
            }
        });

        syncButtonStates();

        // Update reactions list in the panel
        var listSection = document.getElementById('llh-reactions-list');
        if (listSection) {
            renderReactionsList(listSection, data.reactions || []);
        }
    }

    // ─── Header buttons (detail page, next to favorite/trailer) ────────────
    // Uses insertAdjacentHTML for proper custom element registration

    function getHeaderButtonHTML(type) {
        var def = REACTIONS[type];
        var activeClass = (currentReaction === type) ? ' llh-active' : '';
        var id = 'llh-header-' + type;

        var iconHTML;
        if (def.double) {
            iconHTML = '<span class="llh-header-love">' +
                '<span class="material-icons detailButton-icon" aria-hidden="true">thumb_up</span>' +
                '<span class="material-icons detailButton-icon" aria-hidden="true">thumb_up</span>' +
                '</span>';
        } else {
            iconHTML = '<span class="material-icons detailButton-icon" aria-hidden="true">' + def.icon + '</span>';
        }

        return '<button is="emby-button" type="button" class="button-flat detailButton llh-header-btn' + activeClass + '" ' +
            'style="--llh-color:' + def.color + '" title="' + def.name + '" id="' + id + '">' +
            '<div class="detailButton-content">' + iconHTML + '</div>' +
            '</button>';
    }

    function isHeaderButtonsCreated() {
        return document.getElementById('llh-header-1') !== null;
    }

    function createHeaderButtons(itemId) {
        var container = document.querySelector('.mainDetailButtons');
        if (!container) {
            return false;
        }

        if (isHeaderButtonsCreated()) {
            return true;
        }

        // Find the More button (three-dot menu) to insert before
        var moreBtn = container.querySelector('.btnMoreCommands');

        // Insert buttons in desired order: Love, Like, Hate
        var types = [2, 1, 3];

        types.forEach(function (type) {
            var html = getHeaderButtonHTML(type);
            if (moreBtn) {
                moreBtn.insertAdjacentHTML('beforebegin', html);
            } else {
                container.insertAdjacentHTML('beforeend', html);
            }
        });

        // Attach click handlers
        [1, 2, 3].forEach(function (type) {
            var btn = document.getElementById('llh-header-' + type);
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    handleReactionClick(itemId, type);
                });
                headerButtons[type] = btn;
            }
        });


        return true;
    }

    // ─── OSD buttons (video player bottom bar) ─────────────────────────────
    // Uses insertAdjacentHTML approach from InPlayerEpisodePreview plugin

    function getOsdButtonHTML(type) {
        var def = REACTIONS[type];
        var activeClass = (currentReaction === type) ? ' llh-active' : '';
        var id = 'llh-osd-' + type;

        if (def.double) {
            return '<button is="paper-icon-button-light" class="llh-osd-btn autoSize' + activeClass + '" ' +
                'style="--llh-color:' + def.color + '" title="' + def.name + '" id="' + id + '">' +
                '<span class="llh-osd-love">' +
                '<span class="xlargePaperIconButton material-icons" aria-hidden="true">thumb_up</span>' +
                '<span class="xlargePaperIconButton material-icons" aria-hidden="true">thumb_up</span>' +
                '</span></button>';
        }

        return '<button is="paper-icon-button-light" class="llh-osd-btn autoSize' + activeClass + '" ' +
            'style="--llh-color:' + def.color + '" title="' + def.name + '" id="' + id + '">' +
            '<span class="xlargePaperIconButton material-icons" aria-hidden="true">' + def.icon + '</span>' +
            '</button>';
    }

    function isOsdButtonsCreated() {
        return document.getElementById('llh-osd-1') !== null;
    }

    function createOsdButtons(itemId) {

        // Look specifically in the videoOsdBottom area
        var videoOsd = document.querySelector('.videoOsdBottom');
        if (!videoOsd) {
            return false;
        }

        var buttonsContainer = videoOsd.querySelector('.buttons');
        if (!buttonsContainer) {
            return false;
        }

        if (isOsdButtonsCreated()) {
            return true;
        }



        // Find the favorite button to insert after
        var insertAfterElement = null;
        var children = Array.from(buttonsContainer.children);

        // Try various anchors in order of preference
        var anchorSelectors = ['.btnUserRating', '.osdTimeText', '.btnSubtitles', '.btnAudio'];
        for (var i = 0; i < anchorSelectors.length; i++) {
            insertAfterElement = buttonsContainer.querySelector(anchorSelectors[i]);
            if (insertAfterElement) {
                break;
            }
        }

        if (!insertAfterElement) {
            // Fallback: use the last child
            insertAfterElement = buttonsContainer.lastElementChild;
        }

        if (!insertAfterElement) {
            return false;
        }

        // Insert buttons in reverse desired order since afterend stacks them
        // Desired visual order: Love, Like, Hate
        var types = [3, 1, 2];

        types.forEach(function (type) {
            insertAfterElement.insertAdjacentHTML('afterend', getOsdButtonHTML(type));
        });

        // Attach click handlers
        [1, 2, 3].forEach(function (type) {
            var btn = document.getElementById('llh-osd-' + type);
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    handleReactionClick(itemId, type);
                });
                osdButtons[type] = btn;
            }
        });


        return true;
    }

    // ─── Detail panel (Reactions section on movie/show page) ───────────────

    async function createReactionsPanel(itemId) {
        var container = document.createElement('div');
        container.className = 'llh-container';
        container.id = 'llh-reactions-ui';

        // Header
        var header = document.createElement('div');
        header.className = 'llh-header';
        header.textContent = 'Reactions';
        container.appendChild(header);

        // Buttons row
        var buttonsRow = document.createElement('div');
        buttonsRow.className = 'llh-buttons';

        // Load existing reaction
        var myData = await fetchMyReaction(itemId);
        if (myData && myData.reaction) {
            currentReaction = myData.reaction;
        }

        // Load stats
        var data = await fetchReactions(itemId);
        var counts = { 1: data.likes || 0, 2: data.loves || 0, 3: data.hates || 0 };

        // Create 3 buttons
        [2, 1, 3].forEach(function (type) {
            var def = REACTIONS[type];
            var btn = document.createElement('button');
            btn.className = 'llh-btn';
            btn.style.setProperty('--llh-color', def.color);
            if (currentReaction === type) btn.classList.add('active');

            btn.appendChild(createReactionIcon(type));

            var label = document.createElement('span');
            label.textContent = def.name;
            btn.appendChild(label);

            var count = document.createElement('span');
            count.className = 'llh-count';
            count.textContent = counts[type] > 0 ? counts[type] : '';
            btn.appendChild(count);

            btn.addEventListener('click', function () {
                handleReactionClick(itemId, type);
            });

            panelButtons[type] = { btn: btn, count: count };
            buttonsRow.appendChild(btn);
        });

        container.appendChild(buttonsRow);

        // Reactions list
        var listSection = document.createElement('div');
        listSection.className = 'llh-reactions-list';
        listSection.id = 'llh-reactions-list';
        container.appendChild(listSection);

        renderReactionsList(listSection, data.reactions || []);

        return container;
    }

    function renderReactionsList(listSection, reactions) {
        listSection.innerHTML = '';

        if (reactions.length === 0) return;

        var title = document.createElement('div');
        title.className = 'llh-reactions-title';
        title.textContent = 'Community Reactions';
        listSection.appendChild(title);

        var grid = document.createElement('div');
        grid.className = 'llh-reactions-grid';
        listSection.appendChild(grid);

        reactions.forEach(function (r) {
            var type = r.reaction || r.Reaction || 0;
            var def = REACTIONS[type];
            if (!def) return;

            var chip = document.createElement('div');
            chip.className = 'llh-reaction-chip';
            chip.style.setProperty('--llh-chip-color', def.color);

            // Avatar — fetched live from Jellyfin API (always in sync with profile pic)
            var userId = r.userId || r.UserId || '';
            if (userId) {
                var img = document.createElement('img');
                img.className = 'llh-avatar';
                img.alt = '';
                img.src = ApiClient.getUrl('Users/' + userId + '/Images/Primary', { quality: 90, maxWidth: 44 });
                img.onerror = function () {
                    // Replace with fallback icon on error
                    var fallback = document.createElement('span');
                    fallback.className = 'llh-avatar-fallback';
                    fallback.appendChild(createMaterialIcon('person'));
                    chip.replaceChild(fallback, img);
                };
                chip.appendChild(img);
            } else {
                var fallback = document.createElement('span');
                fallback.className = 'llh-avatar-fallback';
                fallback.appendChild(createMaterialIcon('person'));
                chip.appendChild(fallback);
            }

            // Username
            var userName = document.createElement('span');
            userName.className = 'llh-chip-user';
            userName.textContent = r.userName || r.UserName || 'User';
            chip.appendChild(userName);

            // Reaction icon + label
            var iconWrap = document.createElement('span');
            iconWrap.className = 'llh-chip-icon';
            var icon = createReactionIcon(type);
            icon.style.color = def.color;
            iconWrap.appendChild(icon);
            chip.appendChild(iconWrap);

            var label = document.createElement('span');
            label.className = 'llh-chip-label';
            label.textContent = def.name;
            chip.appendChild(label);

            // Date
            var timestamp = r.timestamp || r.Timestamp;
            if (timestamp) {
                var dateEl = document.createElement('span');
                dateEl.className = 'llh-chip-date';
                dateEl.textContent = new Date(timestamp).toLocaleDateString();
                chip.appendChild(dateEl);
            }

            grid.appendChild(chip);
        });
    }

    // ─── Item ID detection ─────────────────────────────────────────────────

    function getItemId() {
        // Skip non-item pages (user profile, settings, admin, etc.)
        var hash = window.location.hash.toLowerCase();
        if (hash.indexOf('userprofile') !== -1 ||
            hash.indexOf('mypreferences') !== -1 ||
            hash.indexOf('dashboard') !== -1 ||
            hash.indexOf('configurationpage') !== -1) {
            return null;
        }

        var itemId = null;
        var href = window.location.href;

        // Method 1: Query string ?id=xxx
        var urlParams = new URLSearchParams(window.location.search);
        itemId = urlParams.get('id');
        if (itemId) return itemId;

        // Method 2: Hash params #!/details?id=xxx or #/details?id=xxx
        if (window.location.hash.indexOf('?') !== -1) {
            var hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
            itemId = hashParams.get('id');
            if (itemId) return itemId;
        }

        // Method 3: Standard GUID with dashes in URL
        var guidMatch = href.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (guidMatch) return guidMatch[1];

        // Method 4: Jellyfin 10.11+ uses 32-char hex IDs without dashes
        var idParamMatch = href.match(/[?&]id=([a-f0-9]{32})/i);
        if (idParamMatch) return idParamMatch[1];

        // Method 5: Look for 32-char hex in URL path segments
        var hex32Match = href.match(/\/([a-f0-9]{32})(?:[?&#/]|$)/i);
        if (hex32Match) return hex32Match[1];

        // Method 6: Try extracting from the page's data attributes
        var detailPage = document.querySelector('[data-id]');
        if (detailPage) {
            itemId = detailPage.getAttribute('data-id');
            if (itemId) return itemId;
        }

        return null;
    }

    // ─── Cleanup ───────────────────────────────────────────────────────────

    function cleanupAllButtons() {
        // Remove header buttons
        [1, 2, 3].forEach(function (type) {
            var btn = document.getElementById('llh-header-' + type);
            if (btn) btn.remove();
        });
        headerButtons = {};

        // Remove OSD buttons
        [1, 2, 3].forEach(function (type) {
            var btn = document.getElementById('llh-osd-' + type);
            if (btn) btn.remove();
        });
        osdButtons = {};

        panelButtons = {};
    }

    // ─── Main injection logic ──────────────────────────────────────────────
    // IMPORTANT: Detail panel, header buttons, and OSD buttons are ALL
    // injected independently. OSD does NOT depend on the detail panel.

    var injectionAttempts = 0;
    var maxInjectionAttempts = 30;
    var idResolutionCache = {}; // rawId -> resolvedId

    async function injectReactionsUI() {
        if (isInjecting) return;

        var rawItemId = getItemId();

        if (!rawItemId) {
            injectionAttempts = 0;
            return;
        }

        // Ensure colors are loaded before rendering anything
        if (!colorsLoaded) {
            fetchColors().then(function () {
                injectReactionsUI();
            });
            return;
        }

        isInjecting = true;

        // Resolve efficient ID (Episode -> Series)
        var finalItemId = rawItemId;
        if (idResolutionCache[rawItemId]) {
            finalItemId = idResolutionCache[rawItemId];
        } else {
            try {
                // Only fetch if it looks like it might be an episode (or just always fetch safely)
                // We'll trust the cache to keep it fast after first load
                var item = await ApiClient.getItem(ApiClient.getCurrentUserId(), rawItemId);
                if (item.Type === 'Episode' && item.SeriesId) {
                    finalItemId = item.SeriesId;
                } else {
                    finalItemId = rawItemId;
                }
                idResolutionCache[rawItemId] = finalItemId;
            } catch (e) {
                console.error('[LikeLoveHate] Error resolving item ID:', e);
                // Fallback to raw ID
                finalItemId = rawItemId;
            }
        }

        // Item changed — clean up old UI
        if (currentItemId !== finalItemId) {
            var existingUI = document.getElementById('llh-reactions-ui');
            if (existingUI) existingUI.remove();
            cleanupAllButtons();
            currentReaction = 0;
            currentItemId = finalItemId;
            injectionAttempts = 0;
        }

        // ── 1. Inject detail panel (only on detail pages) ──
        var existingPanel = document.getElementById('llh-reactions-ui');
        if (!existingPanel) {
            var targetContainer = document.querySelector('.detailPagePrimaryContent .detailSection');
            if (!targetContainer) {
                var primaryContent = document.querySelector('.detailPagePrimaryContent');
                if (primaryContent && primaryContent.children.length > 0) {
                    targetContainer = primaryContent;
                }
            }
            if (!targetContainer) {
                targetContainer = document.querySelector('.detailSection');
            }

            if (targetContainer) {
                injectionAttempts = 0;
                // Create panel with resolved ID
                createReactionsPanel(currentItemId).then(function (ui) {
                    targetContainer.appendChild(ui);

                    // Now try header buttons too
                    createHeaderButtons(currentItemId);
                });
            } else {
                // Don't block other injection on panel failure - just retry silently
                if (injectionAttempts < maxInjectionAttempts) {
                    injectionAttempts++;
                }
            }
        }

        // ── 2. Inject header buttons (detail page, independent of panel) ──
        if (!isHeaderButtonsCreated()) {
            createHeaderButtons(currentItemId);
        }

        // ── 3. Inject OSD buttons (video player, completely independent) ──
        if (!isOsdButtonsCreated()) {
            var videoOsd = document.querySelector('.videoOsdBottom');
            if (videoOsd) {
                createOsdButtons(currentItemId);
            }
        }

        isInjecting = false;
    }

    // ─── Observer for navigation/DOM changes ───────────────────────────────

    var debounceTimer = null;
    var observer = new MutationObserver(function () {
        // Debounce to avoid excessive calls from rapid DOM mutations
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(injectReactionsUI, 250);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check + periodic fallback (catches cases the observer misses)
    setTimeout(injectReactionsUI, 1000);
    setInterval(injectReactionsUI, 3000);



})();
