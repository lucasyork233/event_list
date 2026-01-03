// DOM Elements
const eventForm = document.getElementById('eventForm');
const eventNameInput = document.getElementById('eventName');
const eventNoteInput = document.getElementById('eventNote');
const eventIdInput = document.getElementById('eventId');
const eventsContainer = document.getElementById('eventsContainer');

// Modal related elements
const modal = document.getElementById('modal');
const addEventBtn = document.getElementById('addEventBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.cancel-btn');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');

// Event data storage
let events = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Load events from local storage
    loadEventsFromStorage();
    // Render event list
    renderEvents();

    // Add event button click event
    addEventBtn.addEventListener('click', openModal);

    // Clear all events button click event
    clearAllBtn.addEventListener('click', clearAllEvents);

    // Close modal events
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Open modal
function openModal(eventId = null) {
    modal.style.display = 'block';

    // Clear form
    eventForm.reset();

    if (eventId) {
        // Edit mode
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = 'Edit Event';
            submitBtn.textContent = 'Save Changes';
            eventIdInput.value = event.id;
            eventNameInput.value = event.name;
            eventNoteInput.value = event.note || '';
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Event';
        submitBtn.textContent = 'Add Event';
        eventIdInput.value = '';
    }
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
}

// Edit event
function editEvent(id) {
    openModal(id);
}

// Form submit handler
eventForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get form data
    const name = eventNameInput.value.trim();
    const note = eventNoteInput.value.trim();
    const eventId = eventIdInput.value;

    // Validate required fields
    if (!name) {
        alert('Please enter event name');
        return;
    }

    if (eventId) {
        // Edit existing event
        const eventIndex = events.findIndex(e => e.id === parseInt(eventId));
        if (eventIndex !== -1) {
            events[eventIndex].name = name;
            events[eventIndex].note = note;
        }
    } else {
        // Create new event
        // For new events, set sort_order to current event count, so new events are placed at the end
        const newEvent = {
            id: Date.now(), // Use timestamp as unique ID
            name: name,
            note: note,
            create_time: new Date().toISOString(), // ISO format timestamp
            add_time: '', // Placeholder field, not currently used
            sort_order: events.length, // Use current count as sort value, new events at the end
            completed: false // Initial state is not completed
        };

        // Add to events array
        events.push(newEvent);
    }

    // Save to local storage
    saveEventsToStorage();

    // Re-render event list
    renderEvents();

    // Close modal
    closeModal();
});

// Render event list
function renderEvents() {
    // Clear container
    eventsContainer.innerHTML = '';

    // Sort by sort field, if not available, sort by creation time
    // Order: from top to bottom, old events at top, new events at bottom (from old to new)
    const sortedEvents = [...events].sort((a, b) => {
        // First sort by sort_order (if drag operation exists)
        if (a.sort_order !== undefined && b.sort_order !== undefined &&
            typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
            return a.sort_order - b.sort_order;
        }
        // If no drag operation, sort by creation time from old to new (old events first)
        return new Date(a.create_time) - new Date(b.create_time);
    });

    // If no events, show empty state
    if (sortedEvents.length === 0) {
        eventsContainer.innerHTML = '<div class="empty-state">No events, please add new event</div>';
        return;
    }

    // Render each event
    sortedEvents.forEach((event, index) => {
        const eventElement = createEventElement(event, index + 1);
        eventsContainer.appendChild(eventElement);
    });
}

// Create event element
function createEventElement(event, rank) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-item';
    if (event.completed) {
        eventDiv.classList.add('completed');
    }
    eventDiv.dataset.id = event.id;
    eventDiv.draggable = true;

    // Format date
    const createDate = new Date(event.create_time);
    const formattedDate = `${createDate.getFullYear()}-${(createDate.getMonth() + 1).toString().padStart(2, '0')}-${createDate.getDate().toString().padStart(2, '0')}`;

    // Build HTML
    eventDiv.innerHTML = `
        <div class="event-number">${rank}</div>
        <div class="drag-handle">⋮⋮</div>
        <div class="event-actions">
            <button class="edit-btn" data-id="${event.id}">✎</button>
            <button class="delete-btn" data-id="${event.id}">×</button>
        </div>
        <div class="event-header">
            <div class="event-name" title="Double-click to toggle completion status">${escapeHtml(event.name)}</div>
            <div class="event-date">${formattedDate}</div>
        </div>
        ${event.note ? `<div class="event-note">${escapeHtml(event.note)}</div>` : ''}
    `;

    // Add edit button event
    const editBtn = eventDiv.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => editEvent(event.id));

    // Add delete button event
    const deleteBtn = eventDiv.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteEvent(event.id));

    // Add double-click event (toggle completion status)
    const eventName = eventDiv.querySelector('.event-name');
    eventName.addEventListener('dblclick', () => toggleComplete(event.id));

    // Add drag events
    eventDiv.addEventListener('dragstart', handleDragStart);
    eventDiv.addEventListener('dragend', handleDragEnd);
    eventDiv.addEventListener('dragover', handleDragOver);
    eventDiv.addEventListener('drop', handleDrop);
    eventDiv.addEventListener('dragenter', handleDragEnter);
    eventDiv.addEventListener('dragleave', handleDragLeave);

    return eventDiv;
}

// Toggle event completion status
function toggleComplete(id) {
    const event = events.find(e => e.id === id);
    if (event) {
        // Toggle completion status
        event.completed = !event.completed;

        // Save to local storage
        saveEventsToStorage();

        // Re-render event list
        renderEvents();
    }
}

// Drag related variables
let draggedElement = null;

// Drag start
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

// Drag end
function handleDragEnd(e) {
    this.classList.remove('dragging');

    // Clear all drag-related styles
    const allItems = document.querySelectorAll('.event-item');
    allItems.forEach(item => {
        item.classList.remove('drag-over');
    });
}

// Drag over
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// Drag enter
function handleDragEnter(e) {
    if (draggedElement !== this) {
        this.classList.add('drag-over');
    }
}

// Drag leave
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

// Drag drop
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        // Get the IDs of the two elements
        const draggedId = parseInt(draggedElement.dataset.id);
        const targetId = parseInt(this.dataset.id);

        // Reorder events
        reorderEvents(draggedId, targetId);
    }

    return false;
}

// Reorder events
function reorderEvents(draggedId, targetId) {
    // Get event list by current sort order
    // Order: from top to bottom, old events at top, new events at bottom (from old to new)
    const sortedEvents = [...events].sort((a, b) => {
        // First sort by sort_order (if drag operation exists)
        if (a.sort_order !== undefined && b.sort_order !== undefined &&
            typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
            return a.sort_order - b.sort_order;
        }
        // If no drag operation, sort by creation time from old to new (old events first)
        return new Date(a.create_time) - new Date(b.create_time);
    });

    // Find the index of dragged element and target element
    const draggedIndex = sortedEvents.findIndex(event => event.id === draggedId);
    const targetIndex = sortedEvents.findIndex(event => event.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
        // Move element
        const [draggedEvent] = sortedEvents.splice(draggedIndex, 1);
        sortedEvents.splice(targetIndex, 0, draggedEvent);

        // Reassign sort values
        // Update all events' sort_order to their position index in the list (0, 1, 2, 3...)
        // This ensures the dragged order is saved and maintained after reload
        sortedEvents.forEach((event, index) => {
            const originalEvent = events.find(e => e.id === event.id);
            if (originalEvent) {
                originalEvent.sort_order = index;
            }
        });

        // Save to local storage
        saveEventsToStorage();

        // Re-render event list
        renderEvents();
    }
}

// Delete event
function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
    // Remove event from array
        events = events.filter(event => event.id !== id);

    // Reassign sort_order to ensure continuity
    // Sort by current order, then reassign indices (0, 1, 2, 3...)
        const sortedEvents = [...events].sort((a, b) => {
            if (a.sort_order !== undefined && b.sort_order !== undefined &&
                typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
                return a.sort_order - b.sort_order;
            }
            return new Date(a.create_time) - new Date(b.create_time);
        });

        // Update each event's sort_order
        sortedEvents.forEach((event, index) => {
            const originalEvent = events.find(e => e.id === event.id);
            if (originalEvent) {
                originalEvent.sort_order = index;
            }
        });

        // Save to local storage
        saveEventsToStorage();

        // Re-render event list
        renderEvents();
    }
}

// Clear all events
function clearAllEvents() {
    // If no events, prompt user
    if (events.length === 0) {
        alert('No events to clear');
        return;
    }

    // Show second confirmation dialog
    const confirmClear = confirm(`Are you sure you want to clear all ${events.length} events?\n\nThis action cannot be undone!`);

    if (confirmClear) {
        // Confirm again to prevent mistakes
        const finalConfirm = confirm('Please confirm again: Are you sure you want to clear all events?');

        if (finalConfirm) {
            // Clear events array
            events = [];

            // Clear local storage
            localStorage.removeItem('thingListEvents');

            // Re-render event list (show empty state)
            renderEvents();

            // Prompt user
            alert('All events have been cleared');
        }
    }
}

// HTML escape, prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
}

// Save events to local storage
function saveEventsToStorage() {
    localStorage.setItem('thingListEvents', JSON.stringify(events));
}

// Load events from local storage
function loadEventsFromStorage() {
    const storedEvents = localStorage.getItem('thingListEvents');
    if (storedEvents) {
        try {
            events = JSON.parse(storedEvents);
            // Add sort and completion status fields to old data
            events.forEach((event, index) => {
                if (event.sort_order === undefined) {
                    event.sort_order = index;
                }
                if (event.completed === undefined) {
                    event.completed = false;
                }
            });
        } catch (e) {
            console.error('Failed to parse stored events:', e);
            events = [];
        }
    }
}
