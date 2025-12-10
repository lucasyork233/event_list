// DOM元素
const eventForm = document.getElementById('eventForm');
const eventNameInput = document.getElementById('eventName');
const eventNoteInput = document.getElementById('eventNote');
const eventIdInput = document.getElementById('eventId');
const eventsContainer = document.getElementById('eventsContainer');

// 弹窗相关元素
const modal = document.getElementById('modal');
const addEventBtn = document.getElementById('addEventBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.cancel-btn');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');

// 事件数据存储
let events = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从本地存储加载事件
    loadEventsFromStorage();
    // 渲染事件列表
    renderEvents();

    // 添加事件按钮点击事件
    addEventBtn.addEventListener('click', openModal);

    // 清空所有事件按钮点击事件
    clearAllBtn.addEventListener('click', clearAllEvents);

    // 关闭弹窗事件
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// 打开弹窗
function openModal(eventId = null) {
    modal.style.display = 'block';

    // 清空表单
    eventForm.reset();

    if (eventId) {
        // 编辑模式
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = '编辑事件';
            submitBtn.textContent = '保存修改';
            eventIdInput.value = event.id;
            eventNameInput.value = event.name;
            eventNoteInput.value = event.note || '';
        }
    } else {
        // 添加模式
        modalTitle.textContent = '添加新事件';
        submitBtn.textContent = '添加事件';
        eventIdInput.value = '';
    }
}

// 关闭弹窗
function closeModal() {
    modal.style.display = 'none';
}

// 编辑事件
function editEvent(id) {
    openModal(id);
}

// 表单提交处理
eventForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // 获取表单数据
    const name = eventNameInput.value.trim();
    const note = eventNoteInput.value.trim();
    const eventId = eventIdInput.value;

    // 验证必填字段
    if (!name) {
        alert('请输入事件名称');
        return;
    }

    if (eventId) {
        // 编辑现有事件
        const eventIndex = events.findIndex(e => e.id === parseInt(eventId));
        if (eventIndex !== -1) {
            events[eventIndex].name = name;
            events[eventIndex].note = note;
        }
    } else {
        // 创建新事件
        // 对于新事件，sort_order 设置为当前事件数量，这样新事件会自动排在最后
        const newEvent = {
            id: Date.now(), // 使用时间戳作为唯一ID
            name: name,
            note: note,
            create_time: new Date().toISOString(), // ISO格式的时间戳
            add_time: '', // 占位字段，暂不使用
            sort_order: events.length, // 使用当前数量作为排序值，新事件排在最后
            completed: false // 初始状态为未完成
        };

        // 添加到事件数组
        events.push(newEvent);
    }

    // 保存到本地存储
    saveEventsToStorage();

    // 重新渲染事件列表
    renderEvents();

    // 关闭弹窗
    closeModal();
});

// 渲染事件列表
function renderEvents() {
    // 清空容器
    eventsContainer.innerHTML = '';

    // 按排序字段排序，如果没有则按创建时间排序
    // 顺序：从上到下查看，旧事件在顶部，新增事件在底部（从旧到新）
    const sortedEvents = [...events].sort((a, b) => {
        // 先按sort_order排序（如果有拖拽操作）
        if (a.sort_order !== undefined && b.sort_order !== undefined &&
            typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
            return a.sort_order - b.sort_order;
        }
        // 如果没有拖拽操作，按创建时间从旧到新排序（旧事件在前）
        return new Date(a.create_time) - new Date(b.create_time);
    });

    // 如果没有事件，显示空状态
    if (sortedEvents.length === 0) {
        eventsContainer.innerHTML = '<div class="empty-state">暂无事件，请添加新事件</div>';
        return;
    }

    // 渲染每个事件
    sortedEvents.forEach((event, index) => {
        const eventElement = createEventElement(event, index + 1);
        eventsContainer.appendChild(eventElement);
    });
}

// 创建事件元素
function createEventElement(event, rank) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-item';
    if (event.completed) {
        eventDiv.classList.add('completed');
    }
    eventDiv.dataset.id = event.id;
    eventDiv.draggable = true;

    // 格式化日期
    const createDate = new Date(event.create_time);
    const formattedDate = `${createDate.getFullYear()}-${(createDate.getMonth() + 1).toString().padStart(2, '0')}-${createDate.getDate().toString().padStart(2, '0')}`;

    // 构建HTML
    eventDiv.innerHTML = `
        <div class="event-number">${rank}</div>
        <div class="drag-handle">⋮⋮</div>
        <div class="event-actions">
            <button class="edit-btn" data-id="${event.id}">✎</button>
            <button class="delete-btn" data-id="${event.id}">×</button>
        </div>
        <div class="event-header">
            <div class="event-name" title="双击切换完成状态">${escapeHtml(event.name)}</div>
            <div class="event-date">${formattedDate}</div>
        </div>
        ${event.note ? `<div class="event-note">${escapeHtml(event.note)}</div>` : ''}
    `;

    // 添加编辑按钮事件
    const editBtn = eventDiv.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => editEvent(event.id));

    // 添加删除按钮事件
    const deleteBtn = eventDiv.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteEvent(event.id));

    // 添加双击事件（切换完成状态）
    const eventName = eventDiv.querySelector('.event-name');
    eventName.addEventListener('dblclick', () => toggleComplete(event.id));

    // 添加拖拽事件
    eventDiv.addEventListener('dragstart', handleDragStart);
    eventDiv.addEventListener('dragend', handleDragEnd);
    eventDiv.addEventListener('dragover', handleDragOver);
    eventDiv.addEventListener('drop', handleDrop);
    eventDiv.addEventListener('dragenter', handleDragEnter);
    eventDiv.addEventListener('dragleave', handleDragLeave);

    return eventDiv;
}

// 切换事件完成状态
function toggleComplete(id) {
    const event = events.find(e => e.id === id);
    if (event) {
        // 切换完成状态
        event.completed = !event.completed;

        // 保存到本地存储
        saveEventsToStorage();

        // 重新渲染事件列表
        renderEvents();
    }
}

// 拖拽相关变量
let draggedElement = null;

// 拖拽开始
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

// 拖拽结束
function handleDragEnd(e) {
    this.classList.remove('dragging');

    // 清除所有拖拽相关的样式
    const allItems = document.querySelectorAll('.event-item');
    allItems.forEach(item => {
        item.classList.remove('drag-over');
    });
}

// 拖拽经过
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// 拖拽进入
function handleDragEnter(e) {
    if (draggedElement !== this) {
        this.classList.add('drag-over');
    }
}

// 拖拽离开
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

// 拖拽放置
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        // 获取两个元素的ID
        const draggedId = parseInt(draggedElement.dataset.id);
        const targetId = parseInt(this.dataset.id);

        // 重新排序事件
        reorderEvents(draggedId, targetId);
    }

    return false;
}

// 重新排序事件
function reorderEvents(draggedId, targetId) {
    // 按当前排序获取事件列表
    // 顺序：从上到下查看，旧事件在顶部，新增事件在底部（从旧到新）
    const sortedEvents = [...events].sort((a, b) => {
        // 先按sort_order排序（如果有拖拽操作）
        if (a.sort_order !== undefined && b.sort_order !== undefined &&
            typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
            return a.sort_order - b.sort_order;
        }
        // 如果没有拖拽操作，按创建时间从旧到新排序（旧事件在前）
        return new Date(a.create_time) - new Date(b.create_time);
    });

    // 找到拖拽元素和目标元素的索引
    const draggedIndex = sortedEvents.findIndex(event => event.id === draggedId);
    const targetIndex = sortedEvents.findIndex(event => event.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
        // 移动元素
        const [draggedEvent] = sortedEvents.splice(draggedIndex, 1);
        sortedEvents.splice(targetIndex, 0, draggedEvent);

        // 重新分配排序值
        // 将所有事件的 sort_order 更新为它们在列表中的位置索引（0, 1, 2, 3...）
        // 这样确保了拖动后的顺序会被保存，并且在重新加载后保持
        sortedEvents.forEach((event, index) => {
            const originalEvent = events.find(e => e.id === event.id);
            if (originalEvent) {
                originalEvent.sort_order = index;
            }
        });

        // 保存到本地存储
        saveEventsToStorage();

        // 重新渲染事件列表
        renderEvents();
    }
}

// 删除事件
function deleteEvent(id) {
    if (confirm('确定要删除此事件吗？')) {
        // 从数组中移除事件
        events = events.filter(event => event.id !== id);

        // 重新分配 sort_order，确保连续性
        // 按当前顺序排序后，重新分配索引（0, 1, 2, 3...）
        const sortedEvents = [...events].sort((a, b) => {
            if (a.sort_order !== undefined && b.sort_order !== undefined &&
                typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
                return a.sort_order - b.sort_order;
            }
            return new Date(a.create_time) - new Date(b.create_time);
        });

        // 更新每个事件的 sort_order
        sortedEvents.forEach((event, index) => {
            const originalEvent = events.find(e => e.id === event.id);
            if (originalEvent) {
                originalEvent.sort_order = index;
            }
        });

        // 保存到本地存储
        saveEventsToStorage();

        // 重新渲染事件列表
        renderEvents();
    }
}

// 清空所有事件
function clearAllEvents() {
    // 如果没有事件，提示用户
    if (events.length === 0) {
        alert('当前没有事件可以清空');
        return;
    }

    // 显示二次确认对话框
    const confirmClear = confirm(`确定要清空所有 ${events.length} 个事件吗？\n\n此操作不可恢复！`);

    if (confirmClear) {
        // 再次确认，防止误操作
        const finalConfirm = confirm('请再次确认：真的要清空所有事件吗？');

        if (finalConfirm) {
            // 清空事件数组
            events = [];

            // 清空本地存储
            localStorage.removeItem('thingListEvents');

            // 重新渲染事件列表（显示空状态）
            renderEvents();

            // 提示用户
            alert('所有事件已清空');
        }
    }
}

// HTML转义，防止XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
}

// 保存事件到本地存储
function saveEventsToStorage() {
    localStorage.setItem('thingListEvents', JSON.stringify(events));
}

// 从本地存储加载事件
function loadEventsFromStorage() {
    const storedEvents = localStorage.getItem('thingListEvents');
    if (storedEvents) {
        try {
            events = JSON.parse(storedEvents);
            // 为旧数据添加排序字段和完成状态字段
            events.forEach((event, index) => {
                if (event.sort_order === undefined) {
                    event.sort_order = index;
                }
                if (event.completed === undefined) {
                    event.completed = false;
                }
            });
        } catch (e) {
            console.error('解析存储的事件失败:', e);
            events = [];
        }
    }
}
