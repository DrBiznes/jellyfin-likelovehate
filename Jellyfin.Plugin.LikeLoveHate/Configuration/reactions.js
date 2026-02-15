(function () {
    'use strict';

    console.log('[LikeLoveHate] Loading plugin...');

    // Load Google Material Symbols font
    var materialLink = document.createElement('link');
    materialLink.rel = 'stylesheet';
    materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0';
    document.head.appendChild(materialLink);

    // Reaction definitions
    var REACTIONS = {
        1: { name: 'Like', icon: 'thumb_up', color: '#4fc3f7' },
        2: { name: 'Love', icon: 'thumb_up', color: '#e040fb', double: true },
        3: { name: 'Hate', icon: 'thumb_down', color: '#ef5350' }
    };

    // CSS
    var style = document.createElement('style');
    style.textContent = [
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
        '.llh-reaction-item {',
        '    display: flex;',
        '    align-items: center;',
        '    gap: 0.6em;',
        '    padding: 0.5em 0.75em;',
        '    margin: 0.35em 0;',
        '    background: rgba(0, 0, 0, 0.12);',
        '    border-radius: 6px;',
        '    border: 1px solid rgba(255, 255, 255, 0.05);',
        '    color: #ffffff;',
        '    font-size: 0.9em;',
        '}',
        '.llh-reaction-item .material-symbols-outlined {',
        '    font-size: 1.1em;',
        '}',
        '.llh-reaction-user {',
        '    font-weight: 500;',
        '    flex: 1;',
        '}',
        '.llh-reaction-date {',
        '    font-size: 0.85em;',
        '    color: rgba(255, 255, 255, 0.5);',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    var currentItemId = null;
    var isInjecting = false;
    var hasTriedRefresh = false;

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

    // API helpers
    async function fetchReactions(itemId) {
        try {
            var response = await fetch(ApiClient.getUrl('api/LikeLoveHate/Item/' + itemId), {
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
            var response = await fetch(ApiClient.getUrl('api/LikeLoveHate/MyReaction/' + itemId + '?userId=' + userId), {
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
                'api/LikeLoveHate/React?itemId=' + itemId +
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
            var url = ApiClient.getUrl('api/LikeLoveHate/Reaction?itemId=' + itemId + '&userId=' + userId);
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

    // UI builder
    async function createReactionsUI(itemId) {
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

        var currentReaction = 0;

        // Load existing reaction
        var myData = await fetchMyReaction(itemId);
        if (myData && myData.reaction) {
            currentReaction = myData.reaction;
        }

        // Load stats
        var data = await fetchReactions(itemId);
        var counts = { 1: data.likes || 0, 2: data.loves || 0, 3: data.hates || 0 };

        // Create 3 buttons
        var buttons = {};
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

            btn.addEventListener('click', async function () {
                if (currentReaction === type) {
                    // Toggle off
                    await removeReaction(itemId);
                    currentReaction = 0;
                } else {
                    // Set new reaction
                    await sendReaction(itemId, type);
                    currentReaction = type;
                }

                // Refresh UI
                await refreshUI(itemId, container, buttons, currentReaction);
            });

            buttons[type] = { btn: btn, count: count };
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

    async function refreshUI(itemId, container, buttons, currentReaction) {
        var data = await fetchReactions(itemId);
        var counts = { 1: data.likes || 0, 2: data.loves || 0, 3: data.hates || 0 };

        [1, 2, 3].forEach(function (type) {
            var b = buttons[type];
            if (!b) return;
            b.count.textContent = counts[type] > 0 ? counts[type] : '';
            if (currentReaction === type) {
                b.btn.classList.add('active');
            } else {
                b.btn.classList.remove('active');
            }
        });

        var listSection = container.querySelector('#llh-reactions-list');
        if (listSection) {
            renderReactionsList(listSection, data.reactions || []);
        }
    }

    function renderReactionsList(listSection, reactions) {
        listSection.innerHTML = '';

        if (reactions.length === 0) return;

        var title = document.createElement('div');
        title.className = 'llh-reactions-title';
        title.textContent = 'Community Reactions';
        listSection.appendChild(title);

        reactions.forEach(function (r) {
            var type = r.reaction || r.Reaction || 0;
            var def = REACTIONS[type];
            if (!def) return;

            var item = document.createElement('div');
            item.className = 'llh-reaction-item';

            var icon = createReactionIcon(type);
            icon.style.color = def.color;
            item.appendChild(icon);

            var userName = document.createElement('span');
            userName.className = 'llh-reaction-user';
            userName.textContent = r.userName || r.UserName || 'User';
            item.appendChild(userName);

            var reactionLabel = document.createElement('span');
            reactionLabel.style.color = def.color;
            reactionLabel.style.fontWeight = '500';
            reactionLabel.textContent = def.name;
            item.appendChild(reactionLabel);

            var timestamp = r.timestamp || r.Timestamp;
            if (timestamp) {
                var dateEl = document.createElement('span');
                dateEl.className = 'llh-reaction-date';
                dateEl.textContent = new Date(timestamp).toLocaleDateString();
                item.appendChild(dateEl);
            }

            listSection.appendChild(item);
        });
    }

    // Injection logic
    var injectionAttempts = 0;
    var maxInjectionAttempts = 30;

    function injectReactionsUI() {
        if (isInjecting) return;

        var itemId = null;
        var urlParams = new URLSearchParams(window.location.search);
        itemId = urlParams.get('id');

        if (!itemId && window.location.hash.indexOf('?') !== -1) {
            var hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
            itemId = hashParams.get('id');
        }

        if (!itemId) {
            var guidMatch = window.location.href.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (guidMatch) {
                itemId = guidMatch[1];
            }
        }

        if (!itemId) {
            injectionAttempts = 0;
            return;
        }

        var existingUI = document.getElementById('llh-reactions-ui');
        if (existingUI && currentItemId === itemId) {
            injectionAttempts = 0;
            return;
        }

        if (existingUI && currentItemId !== itemId) {
            existingUI.remove();
        }

        var targetContainer = null;
        targetContainer = document.querySelector('.detailPagePrimaryContent .detailSection');
        if (!targetContainer) {
            var primaryContent = document.querySelector('.detailPagePrimaryContent');
            if (primaryContent && primaryContent.children.length > 0) {
                targetContainer = primaryContent;
            }
        }
        if (!targetContainer) {
            targetContainer = document.querySelector('.detailSection');
        }

        if (!targetContainer) {
            if (injectionAttempts < maxInjectionAttempts) {
                injectionAttempts++;
                var retryDelay = Math.min(100 * Math.pow(1.5, injectionAttempts), 3000);
                setTimeout(injectReactionsUI, retryDelay);
            } else {
                injectionAttempts = 0;
            }
            return;
        }

        currentItemId = itemId;
        isInjecting = true;
        injectionAttempts = 0;

        createReactionsUI(itemId).then(function (ui) {
            targetContainer.appendChild(ui);
            isInjecting = false;
        });
    }

    // Observer for navigation changes
    var observer = new MutationObserver(function () {
        injectReactionsUI();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check + periodic fallback
    setTimeout(injectReactionsUI, 1000);
    setInterval(injectReactionsUI, 2000);

})();
