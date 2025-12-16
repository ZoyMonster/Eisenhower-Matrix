// 数据存储
let items = {
    quadrant1: [],
    quadrant2: [],
    quadrant3: [],
    quadrant4: []
};

let completedItems = [];

// 象限名称映射
const quadrantNames = {
    1: '重要且紧急',
    2: '重要但不紧急',
    3: '不重要但紧急',
    4: '不重要且不紧急'
};

// 拖拽相关变量
let draggedItem = null;
let draggedQuadrant = null;
let dragOverQuadrant = null;
let dragOverItem = null; // 用于同一象限内排序

// 当前聚焦处理的事项（右键选中）
let focusedItemId = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();
    loadData();
    renderAll();
    initDragAndDrop();

    // 定期刷新日期显示，防止跨天后仍显示前一天
    // 每分钟检查一次当前日期并更新头部显示
    setInterval(updateDateDisplay, 60 * 1000);
    
    // 点击模态框外部关闭
    window.onclick = function(event) {
        const addModal = document.getElementById('addModal');
        const editModal = document.getElementById('editModal');
        const settingsModal = document.getElementById('settingsModal');
        if (event.target === addModal) {
            closeAddModal();
        }
        if (event.target === editModal) {
            closeEditModal();
        }
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
    };
    
    // 页面卸载前保存数据（额外保护）
    window.addEventListener('beforeunload', function() {
        saveData();
    });
    
    // 定期自动保存（每30秒）
    setInterval(function() {
        saveData();
    }, 30000);
    
    // 页面可见性变化时保存（切换标签页时）
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            saveData();
        }
    });
});

// 初始化拖拽功能
function initDragAndDrop() {
    // 为每个象限容器添加拖拽事件
    for (let i = 1; i <= 4; i++) {
        const quadrant = document.querySelector(`.quadrant[data-quadrant="${i}"]`);
        const itemsList = document.getElementById(`quadrant-${i}-items`);
        
        if (quadrant) {
            // 允许在象限容器上放置（跨象限拖拽）
            quadrant.addEventListener('dragover', handleDragOver);
            quadrant.addEventListener('dragenter', handleDragEnter);
            quadrant.addEventListener('dragleave', handleDragLeave);
            quadrant.addEventListener('drop', handleDrop);
        }
        
        if (itemsList) {
            // 为事项列表添加拖拽事件（同一象限内排序）
            itemsList.addEventListener('dragover', handleItemDragOver);
            itemsList.addEventListener('dragenter', handleItemDragEnter);
            itemsList.addEventListener('dragleave', handleItemDragLeave);
            itemsList.addEventListener('drop', handleItemDrop);
        }
    }
}

// 更新日期显示
function updateDateDisplay() {
    const dateDisplay = document.getElementById('dateDisplay');
    if (!dateDisplay) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    
    dateDisplay.textContent = `${year}年${month}月${day}日 ${weekday}`;
}

// 输入法组合标记，用于避免中文输入过程中按回车触发提交
let isComposing = false;

// 显示添加事项模态框
function showAddModal(quadrant) {
    const modal = document.getElementById('addModal');
    const textarea = document.getElementById('item-text');
    document.getElementById('modal-quadrant').value = quadrant;
    textarea.value = '';
    modal.style.display = 'block';
    textarea.focus();
    
    // 输入法组合事件，避免中文输入按回车误触发提交
    textarea.oncompositionstart = () => { isComposing = true; };
    textarea.oncompositionend = () => { isComposing = false; };

    // 添加回车键提交功能（仅非组合输入状态）
    textarea.onkeydown = function(e) {
        // Enter键提交（不按Shift），Shift+Enter换行
        if ((e.isComposing || isComposing)) {
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('addForm').dispatchEvent(new Event('submit'));
        }
    };
}

// 关闭添加事项模态框
function closeAddModal() {
    const modal = document.getElementById('addModal');
    modal.style.display = 'none';
    isComposing = false;
}

// 显示编辑事项模态框
function showEditModal(itemId, quadrant, currentText) {
    const modal = document.getElementById('editModal');
    document.getElementById('edit-item-id').value = itemId;
    document.getElementById('edit-item-quadrant').value = quadrant;
    document.getElementById('edit-item-text').value = currentText;
    modal.style.display = 'block';
    const editTextarea = document.getElementById('edit-item-text');
    editTextarea.focus();
    editTextarea.select();

    // 输入法组合事件，避免中文输入按回车误触发提交
    editTextarea.oncompositionstart = () => { isComposing = true; };
    editTextarea.oncompositionend = () => { isComposing = false; };

    // Enter 提交（非组合输入状态），Shift+Enter 换行
    editTextarea.onkeydown = function(e) {
        if ((e.isComposing || isComposing)) {
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('editForm').dispatchEvent(new Event('submit'));
        }
    };
}

// 关闭编辑事项模态框
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    isComposing = false;
}

// 保存编辑的事项
function saveEditItem(event) {
    event.preventDefault();
    
    // 若仍在输入法组合态，阻止提交
    if (isComposing) {
        return;
    }
    
    const itemId = parseInt(document.getElementById('edit-item-id').value);
    const quadrant = parseInt(document.getElementById('edit-item-quadrant').value);
    const newText = document.getElementById('edit-item-text').value.trim();
    
    if (!newText) {
        alert('事项内容不能为空');
        return;
    }
    
    const quadrantKey = `quadrant${quadrant}`;
    let item = items[quadrantKey].find(item => item.id === itemId);
    
    if (item) {
        item.text = newText;
        saveData();
        renderAll();
        closeEditModal();
        return;
    }
    
    const completedIndex = completedItems.findIndex(item => item.id === itemId);
    if (completedIndex !== -1) {
        completedItems[completedIndex].text = newText;
        saveData();
        renderCompleted();
        closeEditModal();
        return;
    }
    
    alert('未找到要编辑的事项');
    closeEditModal();
}

// 添加事项
function addItem(event) {
    event.preventDefault();
    
    // 若仍在输入法组合态，阻止提交
    if (isComposing) {
        return;
    }
    
    const quadrant = parseInt(document.getElementById('modal-quadrant').value);
    const text = document.getElementById('item-text').value.trim();
    
    if (!text) {
        return;
    }
    
    const newItem = {
        id: Date.now(),
        text: text,
        quadrant: quadrant,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    items[`quadrant${quadrant}`].push(newItem);
    
    saveData();
    renderAll();
    closeAddModal();
}

// 完成事项
function completeItem(itemId, quadrant) {
    const quadrantKey = `quadrant${quadrant}`;
    const itemIndex = items[quadrantKey].findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const item = items[quadrantKey][itemIndex];
        item.completed = true;
        item.completedAt = new Date().toISOString();
        
        if (focusedItemId === item.id) {
            focusedItemId = null;
        }
        
        // 移动到已完成清单
        completedItems.push(item);
        
        // 从原象限移除
        items[quadrantKey].splice(itemIndex, 1);
        
        saveData();
        renderAll();
    }
}

// 放回事项到原象限
function restoreItem(itemId) {
    const itemIndex = completedItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const item = completedItems[itemIndex];
        // 恢复为未完成状态
        item.completed = false;
        delete item.completedAt;
        
        // 放回原象限
        const quadrantKey = `quadrant${item.quadrant}`;
        items[quadrantKey].push(item);
        
        // 从已完成清单移除
        completedItems.splice(itemIndex, 1);
        
        saveData();
        renderAll();
    }
}

// 删除事项
function deleteItem(itemId, quadrant) {
    const quadrantKey = `quadrant${quadrant}`;
    
    if (focusedItemId === itemId) {
        focusedItemId = null;
    }
    
    items[quadrantKey] = items[quadrantKey].filter(item => item.id !== itemId);
    
    saveData();
    renderAll();
}

// 删除已完成事项
function deleteCompletedItem(itemId) {
    if (focusedItemId === itemId) {
        focusedItemId = null;
    }
    
    completedItems = completedItems.filter(item => item.id !== itemId);
    
    saveData();
    renderCompleted();
}

// 清空已完成清单
function clearCompleted() {
    if (completedItems.length === 0) {
        return;
    }
    
    if (confirm('确定要清空所有已完成的事项吗？')) {
        completedItems = [];
        saveData();
        renderCompleted();
    }
}

// 渲染所有象限
function renderAll() {
    renderQuadrant(1);
    renderQuadrant(2);
    renderQuadrant(3);
    renderQuadrant(4);
    renderCompleted();
}

// 渲染单个象限
function renderQuadrant(quadrant) {
    const quadrantKey = `quadrant${quadrant}`;
    const container = document.getElementById(`quadrant-${quadrant}-items`);
    const quadrantItems = items[quadrantKey];
    
    container.innerHTML = '';
    
    if (quadrantItems.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无事项，点击上方按钮添加</div>';
        return;
    }
    
    quadrantItems.forEach(item => {
        const itemElement = createItemElement(item, quadrant);
        container.appendChild(itemElement);
    });
}

// 创建事项元素
function createItemElement(item, quadrant) {
    const div = document.createElement('div');
    div.className = 'item';
    div.draggable = true;
    div.dataset.itemId = item.id;
    div.dataset.quadrant = quadrant;
    
     // 如果是当前聚焦的事项，添加聚焦样式
    if (focusedItemId === item.id) {
        div.classList.add('item-focused');
    }
    
    // 拖拽事件
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    // 记录鼠标按下位置，用于区分点击和拖拽
    let mouseDownX = 0;
    let mouseDownY = 0;
    let hasMoved = false;
    
    div.addEventListener('mousedown', (e) => {
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        hasMoved = false;
    });
    
    div.addEventListener('mousemove', (e) => {
        if (Math.abs(e.clientX - mouseDownX) > 5 || Math.abs(e.clientY - mouseDownY) > 5) {
            hasMoved = true;
        }
    });
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.checked = false;
    checkbox.onchange = () => completeItem(item.id, quadrant);
    checkbox.onclick = (e) => e.stopPropagation(); // 阻止事件冒泡
    
    const text = document.createElement('div');
    text.className = 'item-text';
    text.textContent = item.text;
    text.style.cursor = 'pointer';
    // 点击文本区域可以编辑（双击或单击，但排除拖拽）
    text.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡到父元素
        // 如果鼠标没有移动（不是拖拽），则打开编辑模态框
        if (!hasMoved) {
            showEditModal(item.id, quadrant, item.text);
        }
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'item-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        deleteItem(item.id, quadrant);
    };

    // 右键聚焦/取消聚焦当前事项
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFocusItem(item.id, div);
    });

    div.appendChild(checkbox);
    div.appendChild(text);
    div.appendChild(deleteBtn);
    
    return div;
}

// 切换事项聚焦状态（右键）
function toggleFocusItem(itemId, element) {
    if (focusedItemId === itemId) {
        // 再次右键，取消聚焦
        focusedItemId = null;
        element.classList.remove('item-focused');
    } else {
        // 聚焦新的事项，先清除其他聚焦
        focusedItemId = itemId;
        document.querySelectorAll('.item-focused').forEach(el => {
            el.classList.remove('item-focused');
        });
        element.classList.add('item-focused');
    }

    // 每次聚焦变化都保存状态
    saveData();
}

// 拖拽开始
function handleDragStart(e) {
    draggedItem = this;
    draggedQuadrant = parseInt(this.dataset.quadrant);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    // 设置拖拽图像为半透明
    e.dataTransfer.setDragImage(this, 0, 0);
}

// 拖拽结束
function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // 清除所有象限的拖拽悬停样式
    document.querySelectorAll('.quadrant').forEach(q => {
        q.classList.remove('drag-over');
    });
    
    // 清除所有事项的拖拽悬停样式
    document.querySelectorAll('.item').forEach(item => {
        item.classList.remove('drag-over-item');
        item.classList.remove('drag-over-before');
        item.classList.remove('drag-over-after');
    });
    
    draggedItem = null;
    draggedQuadrant = null;
    dragOverQuadrant = null;
    dragOverItem = null;
}

// 拖拽悬停
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// 拖拽进入
function handleDragEnter(e) {
    e.preventDefault();
    const quadrant = e.currentTarget.closest ? e.currentTarget.closest('.quadrant') : e.currentTarget;
    if (quadrant && quadrant.classList.contains('quadrant')) {
        const targetQuadrant = parseInt(quadrant.dataset.quadrant);
        if (targetQuadrant !== draggedQuadrant) {
            quadrant.classList.add('drag-over');
            dragOverQuadrant = targetQuadrant;
        }
    }
}

// 拖拽离开
function handleDragLeave(e) {
    const quadrant = e.currentTarget.closest ? e.currentTarget.closest('.quadrant') : e.currentTarget;
    if (quadrant && quadrant.classList.contains('quadrant')) {
        // 检查是否真的离开了象限区域
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !quadrant.contains(relatedTarget)) {
            quadrant.classList.remove('drag-over');
            if (dragOverQuadrant === parseInt(quadrant.dataset.quadrant)) {
                dragOverQuadrant = null;
            }
        }
    }
}

// 放置
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    const quadrant = e.currentTarget.closest ? e.currentTarget.closest('.quadrant') : e.currentTarget;
    if (!quadrant || !draggedItem || !quadrant.classList.contains('quadrant')) {
        return false;
    }
    
    const targetQuadrant = parseInt(quadrant.dataset.quadrant);
    const itemId = parseInt(draggedItem.dataset.itemId);
    
    // 如果拖拽到不同的象限，移动事项
    if (targetQuadrant !== draggedQuadrant) {
        moveItemToQuadrant(itemId, draggedQuadrant, targetQuadrant);
    }
    
    quadrant.classList.remove('drag-over');
    return false;
}

// 移动事项到另一个象限
function moveItemToQuadrant(itemId, fromQuadrant, toQuadrant) {
    const fromKey = `quadrant${fromQuadrant}`;
    const toKey = `quadrant${toQuadrant}`;
    
    const itemIndex = items[fromKey].findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        const item = items[fromKey][itemIndex];
        // 更新象限
        item.quadrant = toQuadrant;
        // 移动到新象限
        items[toKey].push(item);
        // 从原象限移除
        items[fromKey].splice(itemIndex, 1);
        
        saveData();
        renderAll();
    }
}

// 同一象限内的事项拖拽排序
function handleItemDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    
    const itemsList = e.currentTarget;
    const targetItem = e.target.closest('.item');
    
    if (!targetItem || targetItem === draggedItem) {
        return;
    }
    
    // 检查是否在同一象限
    const targetQuadrant = parseInt(targetItem.dataset.quadrant);
    if (targetQuadrant !== draggedQuadrant) {
        return;
    }
    
    // 计算插入位置
    const rect = targetItem.getBoundingClientRect();
    const mouseY = e.clientY;
    const itemCenterY = rect.top + rect.height / 2;
    
    // 清除之前的样式
    document.querySelectorAll('.item').forEach(item => {
        item.classList.remove('drag-over-before', 'drag-over-after');
    });
    
    // 根据鼠标位置决定插入位置
    if (mouseY < itemCenterY) {
        targetItem.classList.add('drag-over-before');
    } else {
        targetItem.classList.add('drag-over-after');
    }
    
    dragOverItem = targetItem;
}

function handleItemDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleItemDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetItem = e.target.closest('.item');
    if (targetItem && targetItem !== draggedItem) {
        // 检查是否真的离开了事项区域
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !targetItem.contains(relatedTarget)) {
            targetItem.classList.remove('drag-over-before', 'drag-over-after');
            if (dragOverItem === targetItem) {
                dragOverItem = null;
            }
        }
    }
}

function handleItemDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || !dragOverItem) {
        return false;
    }
    
    const draggedItemId = parseInt(draggedItem.dataset.itemId);
    const targetItemId = parseInt(dragOverItem.dataset.itemId);
    const quadrant = draggedQuadrant;
    
    // 如果拖拽到同一象限内的其他事项，调整顺序
    if (quadrant && draggedItemId !== targetItemId) {
        reorderItemsInQuadrant(draggedItemId, targetItemId, quadrant, dragOverItem.classList.contains('drag-over-before'));
    }
    
    // 清除样式
    document.querySelectorAll('.item').forEach(item => {
        item.classList.remove('drag-over-before', 'drag-over-after');
    });
    
    dragOverItem = null;
    return false;
}

// 在同一象限内重新排序事项
function reorderItemsInQuadrant(draggedItemId, targetItemId, quadrant, insertBefore) {
    const quadrantKey = `quadrant${quadrant}`;
    const itemsList = items[quadrantKey];
    
    const draggedIndex = itemsList.findIndex(item => item.id === draggedItemId);
    const targetIndex = itemsList.findIndex(item => item.id === targetItemId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
        return;
    }
    
    // 移除被拖拽的事项
    const [draggedItem] = itemsList.splice(draggedIndex, 1);
    
    // 计算新的插入位置
    let newIndex = targetIndex;
    if (draggedIndex < targetIndex) {
        // 如果从前面拖到后面，目标索引需要减1（因为已经移除了一个元素）
        newIndex = insertBefore ? targetIndex - 1 : targetIndex;
    } else {
        // 如果从后面拖到前面
        newIndex = insertBefore ? targetIndex : targetIndex + 1;
    }
    
    // 插入到新位置
    itemsList.splice(newIndex, 0, draggedItem);
    
    saveData();
    renderAll();
}

// 渲染已完成清单
function renderCompleted() {
    const container = document.getElementById('completed-items');
    container.innerHTML = '';
    
    if (completedItems.length === 0) {
        container.innerHTML = '<div class="completed-empty">暂无已完成事项</div>';
        return;
    }
    
    // 按完成时间倒序排列（最新的在前）
    const sortedItems = [...completedItems].sort((a, b) => {
        return new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt);
    });
    
    sortedItems.forEach(item => {
        const itemElement = createCompletedItemElement(item);
        container.appendChild(itemElement);
    });
}

// 格式化时间
function formatTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // 如果是今天，只显示时间
    if (itemDate.getTime() === today.getTime()) {
        return `今天 ${timeStr}`;
    }
    
    // 如果是昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (itemDate.getTime() === yesterday.getTime()) {
        return `昨天 ${timeStr}`;
    }
    
    // 其他情况显示完整日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日 ${timeStr}`;
}

// 创建已完成事项元素
function createCompletedItemElement(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'completed-item-wrapper';
    
    // 时间显示在卡片上方
    const timeInfo = document.createElement('div');
    timeInfo.className = 'completed-item-time';
    timeInfo.textContent = formatTime(item.completedAt || item.createdAt);
    
    // 事项卡片
    const div = document.createElement('div');
    div.className = 'completed-item';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'completed-item-content';
    
    const text = document.createElement('div');
    text.className = 'completed-item-text';
    text.textContent = item.text;
    text.style.cursor = 'pointer';
    text.onclick = (e) => {
        e.stopPropagation();
        showEditModal(item.id, item.quadrant, item.text);
    };
    
    contentWrapper.appendChild(text);
    
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'completed-item-actions';
    
    const quadrantTag = document.createElement('span');
    quadrantTag.className = 'completed-item-quadrant';
    quadrantTag.textContent = quadrantNames[item.quadrant];
    
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'completed-item-restore';
    restoreBtn.innerHTML = '↩';
    restoreBtn.title = '放回原象限';
    restoreBtn.onclick = () => restoreItem(item.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'completed-item-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => deleteCompletedItem(item.id);
    
    actionsWrapper.appendChild(quadrantTag);
    actionsWrapper.appendChild(restoreBtn);
    actionsWrapper.appendChild(deleteBtn);
    
    div.appendChild(contentWrapper);
    div.appendChild(actionsWrapper);
    
    wrapper.appendChild(timeInfo);
    wrapper.appendChild(div);
    
    return wrapper;
}

// 保存数据到本地存储
function saveData() {
    try {
        const data = {
            items: items,
            completedItems: completedItems,
            focusedItemId: focusedItemId,
            version: '1.0.0', // 数据版本号，用于未来数据迁移
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('eisenhowerMatrix', JSON.stringify(data));
        console.log('数据已保存:', new Date().toLocaleTimeString());
    } catch (e) {
        console.error('保存数据失败:', e);
        // 如果存储空间不足，尝试清理旧数据
        if (e.name === 'QuotaExceededError') {
            alert('存储空间不足，请清理一些已完成的事项');
        }
    }
}

// 从本地存储加载数据
function loadData() {
    const saved = localStorage.getItem('eisenhowerMatrix');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            // 加载待办事项
            if (data.items) {
                items = {
                    quadrant1: Array.isArray(data.items.quadrant1) ? data.items.quadrant1 : [],
                    quadrant2: Array.isArray(data.items.quadrant2) ? data.items.quadrant2 : [],
                    quadrant3: Array.isArray(data.items.quadrant3) ? data.items.quadrant3 : [],
                    quadrant4: Array.isArray(data.items.quadrant4) ? data.items.quadrant4 : []
                };
            } else {
                items = {
                    quadrant1: [],
                    quadrant2: [],
                    quadrant3: [],
                    quadrant4: []
                };
            }
            
            // 加载已完成事项
            completedItems = Array.isArray(data.completedItems) ? data.completedItems : [];
            
            focusedItemId = data.focusedItemId || null;
            if (focusedItemId) {
                const exists = Object.values(items).some(arr => arr.some(item => item.id === focusedItemId));
                if (!exists) {
                    focusedItemId = null;
                }
            }
            
            console.log('数据已加载:', {
                待办事项: Object.values(items).reduce((sum, arr) => sum + arr.length, 0),
                已完成事项: completedItems.length,
                最后保存: data.lastSaved || '未知'
            });
        } catch (e) {
            console.error('加载数据失败:', e);
            // 如果数据损坏，重置为空数据
            items = {
                quadrant1: [],
                quadrant2: [],
                quadrant3: [],
                quadrant4: []
            };
            completedItems = [];
            alert('数据加载失败，已重置为空状态');
        }
    } else {
        // 没有保存的数据，使用默认值
        items = {
            quadrant1: [],
            quadrant2: [],
            quadrant3: [],
            quadrant4: []
        };
        completedItems = [];
        focusedItemId = null;
        console.log('首次使用，数据已初始化');
    }
    
    // 加载设置
    loadSettings();
}

// 显示设置模态框
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const apiKeyInput = document.getElementById('gemini-api-key');
    
    // 加载已保存的 API Key（显示为已填充状态，但不显示实际值）
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        apiKeyInput.placeholder = '已配置（输入新值可更新）';
    } else {
        apiKeyInput.value = '';
        apiKeyInput.placeholder = '请输入 Gemini API Key';
    }
    
    modal.style.display = 'block';
    apiKeyInput.focus();
}

// 关闭设置模态框
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

// 保存设置
function saveSettings(event) {
    event.preventDefault();
    
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    
    if (apiKey) {
        localStorage.setItem('geminiApiKey', apiKey);
        alert('设置已保存！');
    } else {
        // 如果为空，清除保存的 API Key
        localStorage.removeItem('geminiApiKey');
        alert('已清除 API Key');
    }
    
    closeSettingsModal();
}

// 加载设置
function loadSettings() {
    // 设置已在 showSettingsModal 中加载
}

// 导出日报
async function exportDailyReport() {
    console.log('开始导出日报...');
    
    // 检查是否有已完成事项
    if (completedItems.length === 0) {
        console.log('没有已完成事项');
        alert('暂无已完成事项，无法生成日报');
        return;
    }
    
    console.log(`已完成事项数量: ${completedItems.length}`);
    
    // 检查 API Key
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        console.log('未配置 API Key');
        alert('请先在设置中配置 Gemini API Key');
        showSettingsModal();
        return;
    }
    
    console.log('API Key 已配置');
    
    const exportBtn = document.querySelector('.btn-export');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '⏳ 生成中...';
    exportBtn.disabled = true;
    
    try {
        // 准备已完成事项数据
        const today = new Date();
        const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        
        console.log(`日期: ${todayStr}`);
        
        // 按象限分组已完成事项
        const itemsByQuadrant = {
            1: [],
            2: [],
            3: [],
            4: []
        };
        
        completedItems.forEach(item => {
            if (itemsByQuadrant[item.quadrant]) {
                itemsByQuadrant[item.quadrant].push({
                    text: item.text,
                    completedAt: item.completedAt || item.createdAt
                });
            }
        });
        
        console.log('按象限分组完成:', itemsByQuadrant);
        
        // 构建提示词
        const prompt = `请根据以下已完成的工作事项，生成一份专业的工作日报。要求：
1. 使用中文
2. 格式清晰，包含日期、工作总结、完成事项列表
3. 对事项进行分类整理
4. 语言简洁专业

日期：${todayStr}

已完成事项：
${Object.keys(itemsByQuadrant).map(quadrant => {
    const quadrantName = quadrantNames[quadrant];
    const items = itemsByQuadrant[quadrant];
    if (items.length === 0) return '';
    return `\n【${quadrantName}】\n${items.map((item, idx) => {
        const time = formatTime(item.completedAt);
        return `${idx + 1}. ${item.text} (${time})`;
    }).join('\n')}`;
}).filter(s => s).join('\n')}

请生成工作日报：`;

        // 在控制台输出 prompt，方便调试
        console.log('\n========== 发送给 Gemini 的 Prompt ==========');
        console.log(prompt);
        console.log('========== Prompt 结束 ==========\n');

        // 调用 Gemini API - 使用 gemini-2.5-flash 模型
        const modelName = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
            
            // 如果是因为模型不存在，提供更友好的错误信息
            if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
                throw new Error(`模型 ${modelName} 不可用。请检查 API Key 是否正确，或尝试使用其他模型。错误详情：${errorMessage}`);
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // 检查响应数据格式
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error('API 返回数据格式不正确');
        }
        
        const reportText = data.candidates[0].content.parts[0].text;
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const fileName = `工作日报_${dateStr}.txt`;
        
        if (window.electronAPI && typeof window.electronAPI.saveDailyReport === 'function') {
            const result = await window.electronAPI.saveDailyReport({
                defaultFileName: fileName,
                content: reportText
            });
            
            if (result.success) {
                alert('日报导出成功！');
            } else if (result.canceled) {
                alert('已取消导出');
            } else {
                throw new Error(result.error || '保存失败，请重试');
            }
        } else {
            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
            alert('日报导出成功！');
        }
        
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + (error.message || '请检查 API Key 是否正确或网络连接'));
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

