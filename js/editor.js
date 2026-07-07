/**
 * editor.js — Schema-driven content editor engine
 *
 * Reads EDITOR_SCHEMA (from editor-schema.js) and auto-generates
 * form UI. Reuses renderHome() (from renderer.js) for live preview.
 *
 * See docs/EDITOR.md for architecture details and extension guide.
 */

// ─── State ──────────────────────────────────────────────────────
let editorState = {};
let activeSection = null;
let hasUnsavedChanges = false;
let previewTimer = null;

// ─── Initialization ─────────────────────────────────────────────

function initEditor() {
    buildTabs();
    bindToolbarEvents();
    fetch('contents/data.json')
        .then(r => r.json())
        .then(data => loadData(data))
        .catch(err => {
            console.error('Error loading data.json:', err);
            alert('Failed to load data.json. Make sure you are running a local server.');
        });

    window.addEventListener('beforeunload', function (e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function buildTabs() {
    const container = document.getElementById('editor-tabs');
    EDITOR_SCHEMA.forEach(section => {
        const btn = document.createElement('button');
        btn.className = 'editor-tab';
        btn.textContent = section.label;
        btn.dataset.key = section.key;
        btn.addEventListener('click', () => switchSection(section.key));
        container.appendChild(btn);
    });
}

function switchSection(key) {
    activeSection = key;
    // Update tab active state
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.key === key);
    });
    // Build form for this section
    const section = EDITOR_SCHEMA.find(s => s.key === key);
    if (section) {
        buildSectionForm(section);
    }
}

function bindToolbarEvents() {
    document.getElementById('btn-copy').addEventListener('click', copyJSON);
    initResizeHandle();
}

function initResizeHandle() {
    const handle = document.getElementById('btn-toggle-preview');
    const panel = document.getElementById('editor-preview-panel');
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    let didDrag = false;

    handle.addEventListener('mousedown', (e) => {
        // Don't start drag if preview is hidden
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            panel.style.width = '50%';
            panel.style.minWidth = '200px';
            return;
        }
        isDragging = true;
        didDrag = false;
        startX = e.clientX;
        startWidth = panel.getBoundingClientRect().width;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = startX - e.clientX;
        const newWidth = Math.max(200, startWidth + dx);
        panel.style.width = newWidth + 'px';
        panel.style.minWidth = '200px';
        if (Math.abs(dx) > 4) didDrag = true;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // If it was a click (not a drag), toggle hide
        if (!didDrag) {
            panel.classList.add('hidden');
            panel.style.width = '';
            panel.style.minWidth = '';
        }
    });

    // Double-click to reset width
    handle.addEventListener('dblclick', () => {
        panel.classList.remove('hidden');
        panel.style.width = '50%';
        panel.style.minWidth = '200px';
    });
}

// ─── Form Generation ────────────────────────────────────────────

function buildSectionForm(sectionSchema) {
    const container = document.getElementById('editor-form');
    container.innerHTML = '';

    // Section header
    const header = document.createElement('div');
    header.className = 'editor-section-title';
    header.textContent = sectionSchema.label;
    container.appendChild(header);

    // Build fields
    sectionSchema.fields.forEach(fieldSchema => {
        const path = fieldSchema.key === '_self' ? sectionSchema.key : sectionSchema.key + '.' + fieldSchema.key;
        const value = getNestedValue(editorState, path);
        const el = renderField(fieldSchema, value, path);
        container.appendChild(el);
    });
}

function renderField(schema, value, path) {
    switch (schema.type) {
        case 'text':     return renderTextField(schema, value, path);
        case 'textarea': return renderTextareaField(schema, value, path);
        case 'number':   return renderNumberField(schema, value, path);
        case 'url':      return renderTextField(schema, value, path); // same as text
        case 'toggle':   return renderToggleField(schema, value, path);
        case 'select':   return renderSelectField(schema, value, path);
        case 'object':   return renderObjectField(schema, value, path);
        case 'array':    return renderArrayField(schema, value, path);
        case 'keyvalue': return renderKeyValueField(schema, value, path);
        default:         return renderTextField(schema, value, path);
    }
}

function createFieldWrapper(schema) {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-field';

    if (schema.label) {
        const label = document.createElement('label');
        label.textContent = schema.label;
        if (schema.required) {
            const req = document.createElement('span');
            req.className = 'field-required';
            req.textContent = '*';
            label.appendChild(req);
        }
        wrapper.appendChild(label);
    }

    if (schema.description) {
        const desc = document.createElement('div');
        desc.className = 'field-description';
        desc.textContent = schema.description;
        wrapper.appendChild(desc);
    }

    return wrapper;
}

function renderTextField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const input = document.createElement('input');
    input.type = schema.type === 'url' ? 'url' : 'text';
    input.value = value || '';
    if (schema.placeholder) input.placeholder = schema.placeholder;
    input.addEventListener('input', () => {
        setNestedValue(editorState, path, input.value);
        markDirty();
    });
    wrapper.appendChild(input);
    return wrapper;
}

function renderTextareaField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const textarea = document.createElement('textarea');
    textarea.value = value || '';
    if (schema.placeholder) textarea.placeholder = schema.placeholder;
    textarea.addEventListener('input', () => {
        setNestedValue(editorState, path, textarea.value);
        markDirty();
    });
    wrapper.appendChild(textarea);
    return wrapper;
}

function renderNumberField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value != null ? value : '';
    if (schema.placeholder) input.placeholder = schema.placeholder;
    input.addEventListener('input', () => {
        const v = input.value === '' ? null : Number(input.value);
        setNestedValue(editorState, path, v);
        markDirty();
    });
    wrapper.appendChild(input);
    return wrapper;
}

function renderToggleField(schema, value, path) {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-field';

    const toggleWrapper = document.createElement('div');
    toggleWrapper.className = 'editor-toggle-wrapper';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    const id = 'toggle-' + path.replace(/\./g, '-');
    input.id = id;
    input.addEventListener('change', () => {
        setNestedValue(editorState, path, input.checked);
        markDirty();
    });

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = schema.label || '';

    toggleWrapper.appendChild(input);
    toggleWrapper.appendChild(label);
    wrapper.appendChild(toggleWrapper);
    return wrapper;
}

function renderSelectField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const select = document.createElement('select');
    (schema.options || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === value) option.selected = true;
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        setNestedValue(editorState, path, select.value);
        markDirty();
    });
    wrapper.appendChild(select);
    return wrapper;
}

function renderObjectField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const group = document.createElement('div');
    const inlineTypes = ['text', 'url', 'number', 'toggle', 'select'];
    const isSimple = schema.inline !== false && schema.fields && schema.fields.length <= 4 &&
        schema.fields.every(f => inlineTypes.includes(f.type));

    group.className = isSimple ? 'editor-inline-object' : 'editor-object-group';

    const obj = value || {};
    schema.fields.forEach(fieldSchema => {
        const fieldPath = path + '.' + fieldSchema.key;
        const fieldValue = obj[fieldSchema.key];
        const fieldEl = renderField(fieldSchema, fieldValue, fieldPath);
        if (isSimple && fieldSchema.flex != null) {
            fieldEl.style.flex = String(fieldSchema.flex);
        }
        group.appendChild(fieldEl);
    });

    wrapper.appendChild(group);
    return wrapper;
}

function renderArrayField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const arr = value || [];

    // Ensure array exists in state
    if (!getNestedValue(editorState, path)) {
        setNestedValue(editorState, path, []);
    }

    const container = document.createElement('div');
    container.className = 'editor-array-container';

    const isSimpleItem = schema.itemSchema.type === 'text' || schema.itemSchema.type === 'textarea';
    const isComplexObject = schema.itemSchema.type === 'object' &&
        schema.itemSchema.fields && (schema.itemSchema.fields.length > 3 || schema.itemSchema.labelKey || schema.itemSchema.collapsible);

    const addAtEnd = schema.addPosition === 'end';

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'editor-btn editor-btn-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
        const template = createDefaultValue(schema.itemSchema);
        if (addAtEnd) {
            addArrayItem(path, template);
        } else {
            prependArrayItem(path, template);
        }
        rebuildCurrentSection();
    });

    if (!addAtEnd) container.appendChild(addBtn);

    arr.forEach((item, index) => {
        const itemEl = createArrayItem(schema, item, path, index, arr.length, isSimpleItem, isComplexObject, schema.showIndex, schema.connectionCheck);
        container.appendChild(itemEl);
    });

    if (addAtEnd) container.appendChild(addBtn);

    // Collapsible array section
    if (schema.collapsible) {
        const collapseWrapper = document.createElement('div');
        collapseWrapper.className = 'editor-array-collapsible collapsed';
        collapseWrapper.dataset.path = path;

        const collapseHeader = document.createElement('div');
        collapseHeader.className = 'editor-array-collapse-header';
        collapseHeader.innerHTML = `<span>${schema.label || ''} (${arr.length})</span><span class="collapse-icon">▼</span>`;
        collapseHeader.addEventListener('click', () => {
            collapseWrapper.classList.toggle('collapsed');
        });

        collapseWrapper.appendChild(collapseHeader);
        collapseWrapper.appendChild(container);
        wrapper.appendChild(collapseWrapper);
    } else {
        wrapper.appendChild(container);
    }
    return wrapper;
}

function getItemSummary(itemSchema, item) {
    if (!item || typeof item !== 'object') return String(item || '');
    // Use labelKey if defined
    if (itemSchema.labelKey && item[itemSchema.labelKey]) {
        return escapeHtml(item[itemSchema.labelKey]);
    }
    // Otherwise collect the first few non-empty string values
    const parts = [];
    for (const f of (itemSchema.fields || [])) {
        const v = item[f.key];
        if (typeof v === 'string' && v.trim()) {
            parts.push(v.trim());
        }
        if (parts.length >= 2) break;
    }
    if (parts.length > 0) {
        let text = parts.length >= 2
            ? '[' + parts[0] + '] ' + parts.slice(1).join(' ')
            : parts[0];
        // Strip annotation braces like {TOKEN} → TOKEN
        // Token charset must match renderNewsContent() in renderer.js ([\w-]+).
        text = text.replace(/\{([\w-]+)\}/g, '$1');
        if (text.length > 80) text = text.slice(0, 77) + '...';
        return escapeHtml(text);
    }
    return '(empty)';
}

function updateConnectionDot(dot, item) {
    if (!item) return;
    const name = (item.name || '').trim();
    const myName = (editorState.profile && editorState.profile.myName) || '';
    const isMe = name && name === myName;
    const connections = editorState.connections || {};
    if (isMe) {
        dot.className = 'editor-connection-dot me';
        dot.dataset.tip = "It's you";
    } else if (name && connections[name]) {
        dot.className = 'editor-connection-dot linked';
        dot.dataset.tip = 'Connection Found';
    } else if (name) {
        dot.className = 'editor-connection-dot missing';
        dot.dataset.tip = 'Connection Not Found';
    } else {
        dot.className = 'editor-connection-dot hidden';
        dot.dataset.tip = '';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function createArrayItem(schema, item, arrayPath, index, totalCount, isSimple, isComplex, showIndex, connectionCheck) {
    const itemPath = arrayPath + '.' + index;

    if (isSimple) {
        // Simple item: single input + controls inline
        const row = document.createElement('div');
        row.className = 'editor-array-item-simple';
        if (showIndex) {
            const idx = document.createElement('span');
            idx.className = 'editor-array-index';
            idx.textContent = index + 1;
            row.appendChild(idx);
        }
        row.appendChild(renderField(
            { ...schema.itemSchema, label: null },
            item,
            itemPath
        ));
        row.appendChild(createArrayControls(arrayPath, index, totalCount));
        return row;
    }

    // Complex/object item: collapsible card
    const itemEl = document.createElement('div');
    itemEl.className = isComplex ? 'editor-array-item collapsed' : 'editor-array-item';
    itemEl.dataset.path = itemPath;

    if (showIndex) {
        const idx = document.createElement('span');
        idx.className = 'editor-array-index';
        idx.textContent = index + 1;
        itemEl.appendChild(idx);
    }

    const content = document.createElement('div');
    content.className = 'editor-array-item-content';

    if (isComplex && schema.itemSchema.type === 'object') {
        // Collapsible header — show a meaningful summary from the item's fields
        const header = document.createElement('div');
        header.className = 'editor-array-item-header';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'editor-array-item-label';
        labelSpan.innerHTML = getItemSummary(schema.itemSchema, item);
        header.appendChild(labelSpan);
        const collapseIcon = document.createElement('span');
        collapseIcon.className = 'collapse-icon';
        collapseIcon.textContent = '▼';
        header.appendChild(collapseIcon);
        header.addEventListener('click', () => {
            itemEl.classList.toggle('collapsed');
        });
        content.appendChild(header);

        const body = document.createElement('div');
        body.className = 'editor-array-item-body';
        schema.itemSchema.fields.forEach(fieldSchema => {
            const fieldPath = itemPath + '.' + fieldSchema.key;
            body.appendChild(renderField(fieldSchema, item[fieldSchema.key], fieldPath));
        });
        // Live-update header label when any field inside changes
        body.addEventListener('input', () => {
            const currentItem = getNestedValue(editorState, itemPath);
            labelSpan.innerHTML = getItemSummary(schema.itemSchema, currentItem);
        });
        content.appendChild(body);
    } else if (schema.itemSchema.type === 'object') {
        // Non-complex object: render as inline object via renderObjectField
        const objField = renderObjectField(
            { ...schema.itemSchema, label: null },
            item,
            itemPath
        );
        content.appendChild(objField);
    } else {
        content.appendChild(renderField(
            { ...schema.itemSchema, label: null },
            item,
            itemPath
        ));
    }

    itemEl.appendChild(content);

    // Connection check indicator
    if (connectionCheck && schema.itemSchema.type === 'object') {
        const dot = document.createElement('span');
        dot.className = 'editor-connection-dot';
        updateConnectionDot(dot, item);
        // Live update on input
        content.addEventListener('input', () => {
            const currentItem = getNestedValue(editorState, arrayPath + '.' + index);
            updateConnectionDot(dot, currentItem);
        });
        itemEl.appendChild(dot);
    }

    itemEl.appendChild(createArrayControls(arrayPath, index, totalCount));
    return itemEl;
}

function createArrayControls(arrayPath, index, totalCount) {
    const controls = document.createElement('div');
    controls.className = 'editor-array-item-controls';

    if (index > 0) {
        const upBtn = document.createElement('button');
        upBtn.textContent = '↑';
        upBtn.title = 'Move up';
        upBtn.addEventListener('click', () => {
            moveArrayItem(arrayPath, index, index - 1);
            rebuildCurrentSection();
        });
        controls.appendChild(upBtn);
    }

    if (index < totalCount - 1) {
        const downBtn = document.createElement('button');
        downBtn.textContent = '↓';
        downBtn.title = 'Move down';
        downBtn.addEventListener('click', () => {
            moveArrayItem(arrayPath, index, index + 1);
            rebuildCurrentSection();
        });
        controls.appendChild(downBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove';
    removeBtn.style.color = 'var(--iro-pub-emphasis-color)';
    removeBtn.addEventListener('click', () => {
        removeArrayItem(arrayPath, index);
        rebuildCurrentSection();
    });
    controls.appendChild(removeBtn);

    return controls;
}

function renderKeyValueField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const obj = value || {};
    const entries = Object.entries(obj);

    const container = document.createElement('div');
    container.className = 'editor-kv-container';

    entries.forEach(([key, val], index) => {
        container.appendChild(createKVRow(path, key, val, container));
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'editor-btn editor-btn-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
        container.insertBefore(createKVRow(path, '', '', container), addBtn);
        // Initialize in state
        syncKVToState(path, container);
    });
    container.appendChild(addBtn);

    wrapper.appendChild(container);
    return wrapper;
}

function createKVRow(path, key, val, container) {
    const row = document.createElement('div');
    row.className = 'editor-kv-row';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.value = key;
    keyInput.placeholder = 'Key';
    keyInput.addEventListener('input', () => syncKVToState(path, container));

    const sep = document.createElement('span');
    sep.className = 'kv-separator';
    sep.textContent = '→';

    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.value = val;
    valInput.placeholder = 'Value';
    valInput.addEventListener('input', () => syncKVToState(path, container));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'editor-btn editor-btn-danger';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
        row.remove();
        syncKVToState(path, container);
    });

    row.appendChild(keyInput);
    row.appendChild(sep);
    row.appendChild(valInput);
    row.appendChild(removeBtn);
    return row;
}

function syncKVToState(path, container) {
    const obj = {};
    container.querySelectorAll('.editor-kv-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const k = inputs[0].value.trim();
        const v = inputs[1].value;
        if (k) obj[k] = v;
    });
    setNestedValue(editorState, path, obj);
    markDirty();
}

// ─── Default Value Creation ─────────────────────────────────────

function createDefaultValue(schema) {
    switch (schema.type) {
        case 'text':
        case 'textarea':
        case 'url':
            return '';
        case 'number':
            return 0;
        case 'toggle':
            return false;
        case 'select':
            return schema.options ? schema.options[0] : '';
        case 'object':
            const obj = {};
            (schema.fields || []).forEach(f => {
                obj[f.key] = createDefaultValue(f);
            });
            return obj;
        case 'array':
            return [];
        case 'keyvalue':
            return {};
        default:
            return '';
    }
}

// ─── State Management ───────────────────────────────────────────

function getNestedValue(obj, path) {
    const keys = parsePath(path);
    let current = obj;
    for (const key of keys) {
        if (current == null) return undefined;
        current = current[key];
    }
    return current;
}

function setNestedValue(obj, path, value) {
    const keys = parsePath(path);
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] == null) {
            // Determine if next key is a number (array) or string (object)
            const nextKey = keys[i + 1];
            current[key] = typeof nextKey === 'number' ? [] : {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
}

function parsePath(path) {
    // Convert "publications.0.authors.1.name" to ["publications", 0, "authors", 1, "name"]
    return path.split('.').map(seg => /^\d+$/.test(seg) ? Number(seg) : seg);
}

// ─── Array Operations ───────────────────────────────────────────

function addArrayItem(path, template) {
    const arr = getNestedValue(editorState, path);
    if (Array.isArray(arr)) {
        arr.push(template);
    }
}

function prependArrayItem(path, template) {
    const arr = getNestedValue(editorState, path);
    if (Array.isArray(arr)) {
        arr.unshift(template);
    }
}

function removeArrayItem(path, index) {
    const arr = getNestedValue(editorState, path);
    if (Array.isArray(arr)) {
        arr.splice(index, 1);
    }
}

function moveArrayItem(path, fromIndex, toIndex) {
    const arr = getNestedValue(editorState, path);
    if (Array.isArray(arr) && fromIndex >= 0 && toIndex >= 0 && toIndex < arr.length) {
        const item = arr.splice(fromIndex, 1)[0];
        arr.splice(toIndex, 0, item);
    }
}

// ─── Rebuild Helper ─────────────────────────────────────────────

function rebuildCurrentSection() {
    if (activeSection) {
        const section = EDITOR_SCHEMA.find(s => s.key === activeSection);
        if (section) {
            const expanded = captureExpandedPaths();
            buildSectionForm(section);
            restoreExpandedPaths(expanded);
        }
    }
    markDirty();
}

function captureExpandedPaths() {
    const paths = new Set();
    const form = document.getElementById('editor-form');
    if (!form) return paths;
    form.querySelectorAll('.editor-array-item[data-path]:not(.collapsed)').forEach(el => {
        paths.add('item:' + el.dataset.path);
    });
    form.querySelectorAll('.editor-array-collapsible[data-path]:not(.collapsed)').forEach(el => {
        paths.add('arr:' + el.dataset.path);
    });
    return paths;
}

function restoreExpandedPaths(paths) {
    if (!paths || paths.size === 0) return;
    const form = document.getElementById('editor-form');
    if (!form) return;
    form.querySelectorAll('.editor-array-item[data-path]').forEach(el => {
        if (paths.has('item:' + el.dataset.path)) el.classList.remove('collapsed');
    });
    form.querySelectorAll('.editor-array-collapsible[data-path]').forEach(el => {
        if (paths.has('arr:' + el.dataset.path)) el.classList.remove('collapsed');
    });
}

function markDirty() {
    hasUnsavedChanges = true;
    schedulePreviewUpdate();
}

// ─── Data Loading ───────────────────────────────────────────────

function loadData(json) {
    editorState = JSON.parse(JSON.stringify(json)); // deep clone
    hasUnsavedChanges = false;

    // Switch to first section and build form
    const firstKey = EDITOR_SCHEMA[0].key;
    switchSection(firstKey);
    updatePreview();
}

async function copyJSON() {
    const jsonStr = JSON.stringify(editorState, null, 4) + '\n';

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(jsonStr);
            hasUnsavedChanges = false;
            showToast('Copied to clipboard');
            return;
        } catch (err) {
            console.error('Clipboard API failed, falling back:', err);
        }
    }

    // Fallback for non-secure contexts (file://, LAN IP, etc.)
    const ta = document.createElement('textarea');
    ta.value = jsonStr;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch (err) {
        console.error('execCommand copy failed:', err);
    }
    document.body.removeChild(ta);

    if (ok) {
        hasUnsavedChanges = false;
        showToast('Copied to clipboard');
    } else {
        promptManualCopy(jsonStr);
    }
}

function promptManualCopy(jsonStr) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--iro-bg-color,#fff);color:var(--iro-text-color,#000);padding:20px;border-radius:6px;max-width:80vw;max-height:80vh;display:flex;flex-direction:column;gap:10px;';
    const msg = document.createElement('div');
    msg.textContent = 'Clipboard unavailable (page is not in a secure context). Press Cmd/Ctrl+C to copy, then Esc to close.';
    const ta = document.createElement('textarea');
    ta.value = jsonStr;
    ta.style.cssText = 'width:60vw;height:50vh;font-family:monospace;font-size:12px;';
    const close = () => document.body.removeChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    box.appendChild(msg);
    box.appendChild(ta);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ta.focus();
    ta.select();
}

function showToast(message) {
    let toast = document.getElementById('editor-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'editor-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:10px 20px;border-radius:4px;font-size:14px;z-index:200;opacity:0;transition:opacity 0.3s;pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.style.backgroundColor = 'var(--iro-theme-color)';
    toast.style.color = 'var(--iro-aux-color)';
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ─── Live Preview ───────────────────────────────────────────────

function updatePreview() {
    const previewEl = document.getElementById('editor-preview');
    if (!previewEl) return;

    try {
        previewEl.innerHTML = renderHome(editorState);
        // Apply auto-linking
        ConnectionsDict = editorState.connections || {};
        addConnectionLink(previewEl);
    } catch (err) {
        previewEl.innerHTML = '<p style="color:red;">Preview error: ' + err.message + '</p>';
    }
}

function schedulePreviewUpdate() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 300);
}
