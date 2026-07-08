// Bill Reminder App
let bills = JSON.parse(localStorage.getItem('bills')) || [];

const billForm = document.getElementById('bill-form');
const billsList = document.getElementById('bills-list');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');

const upcomingCountEl = document.getElementById('upcoming-count');
const totalDueEl = document.getElementById('total-due');
const thisMonthEl = document.getElementById('this-month');

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Calculate days until due
function daysUntil(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Generate next due date for recurring bills
function getNextDueDate(bill) {
    if (bill.recurrence === 'one-time') return bill.dueDate;
    
    let nextDue = new Date(bill.dueDate);
    const today = new Date();
    
    while (nextDue < today) {
        if (bill.recurrence === 'monthly') {
            nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (bill.recurrence === 'yearly') {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
    }
    return nextDue.toISOString().split('T')[0];
}

// Render bills
function renderBills(filteredBills) {
    billsList.innerHTML = '';
    
    if (filteredBills.length === 0) {
        billsList.innerHTML = '<li style="padding:20px;text-align:center;color:#999;">No bills found</li>';
        return;
    }
    
    filteredBills.forEach((bill, index) => {
        const dueDate = bill.recurrence !== 'one-time' ? getNextDueDate(bill) : bill.dueDate;
        const days = daysUntil(dueDate);
        const isOverdue = days < 0;
        const isPaid = bill.paid || false;
        
        const billEl = document.createElement('li');
        billEl.className = `bill-item ${isPaid ? 'paid' : (isOverdue ? 'overdue' : 'upcoming')}`;
        
        billEl.innerHTML = `
            <div class="bill-info">
                <div class="bill-name">${bill.name}</div>
                <div class="bill-details">
                    ${bill.category} • Due: ${new Date(dueDate).toLocaleDateString()}
                    ${bill.recurrence !== 'one-time' ? `(${bill.recurrence})` : ''}
                    ${isOverdue ? ' <span style="color:#e74c3c">(OVERDUE)</span>' : ''}
                </div>
            </div>
            <div class="bill-amount">${formatCurrency(bill.amount)}</div>
            <div class="bill-actions">
                ${!isPaid ? `
                <button class="btn btn-pay" onclick="markPaid(${index})">Paid</button>
                ` : ''}
                <button class="btn btn-delete" onclick="deleteBill(${index})">Delete</button>
            </div>
        `;
        
        billsList.appendChild(billEl);
    });
}

// Update stats
function updateStats() {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let upcoming = 0;
    let totalDue = 0;
    let thisMonthCount = 0;
    
    bills.forEach(bill => {
        if (bill.paid) return;
        
        const dueDateStr = bill.recurrence !== 'one-time' ? getNextDueDate(bill) : bill.dueDate;
        const dueDate = new Date(dueDateStr);
        const days = daysUntil(dueDateStr);
        
        if (days <= 30 && days >= 0) upcoming++;
        if (days >= 0) totalDue += parseFloat(bill.amount);
        
        if (dueDate >= thisMonthStart && dueDate <= thisMonthEnd) {
            thisMonthCount++;
        }
    });
    
    upcomingCountEl.textContent = upcoming;
    totalDueEl.textContent = formatCurrency(totalDue);
    thisMonthEl.textContent = thisMonthCount;
}

// Add new bill
billForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newBill = {
        name: document.getElementById('bill-name').value,
        amount: parseFloat(document.getElementById('bill-amount').value),
        dueDate: document.getElementById('bill-due').value,
        recurrence: document.getElementById('bill-recurrence').value,
        category: document.getElementById('bill-category').value,
        paid: false,
        id: Date.now()
    };
    
    bills.push(newBill);
    saveBills();
    renderBills(bills);
    updateStats();
    billForm.reset();
});

// Mark as paid
window.markPaid = function(index) {
    bills[index].paid = true;
    saveBills();
    renderBills(getFilteredBills());
    updateStats();
    
    // Show toast
    showToast('Bill marked as paid!');
};

// Delete bill
window.deleteBill = function(index) {
    if (confirm('Delete this bill?')) {
        bills.splice(index, 1);
        saveBills();
        renderBills(getFilteredBills());
        updateStats();
    }
};

// Save to localStorage
function saveBills() {
    localStorage.setItem('bills', JSON.stringify(bills));
}

// Get filtered bills
function getFilteredBills() {
    const searchTerm = searchInput.value.toLowerCase();
    const filter = filterStatus.value;
    
    return bills.filter(bill => {
        const matchesSearch = bill.name.toLowerCase().includes(searchTerm) || 
                             bill.category.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
        
        if (filter === 'all') return true;
        
        const dueDateStr = bill.recurrence !== 'one-time' ? getNextDueDate(bill) : bill.dueDate;
        const days = daysUntil(dueDateStr);
        
        if (filter === 'upcoming') return days >= 0 && !bill.paid;
        if (filter === 'overdue') return days < 0 && !bill.paid;
        if (filter === 'paid') return bill.paid;
        
        return true;
    });
}

// Search and filter listeners
searchInput.addEventListener('input', () => {
    renderBills(getFilteredBills());
});

filterStatus.addEventListener('change', () => {
    renderBills(getFilteredBills());
});

// Show reminder toast
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#27ae60';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.zIndex = '1000';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Check for reminders
function checkReminders() {
    const remindersDiv = document.getElementById('reminders');
    remindersDiv.innerHTML = '<h3>🔔 Reminders</h3>';
    
    const urgentBills = bills.filter(bill => {
        if (bill.paid) return false;
        const dueStr = bill.recurrence !== 'one-time' ? getNextDueDate(bill) : bill.dueDate;
        const days = daysUntil(dueStr);
        return days <= 7 && days >= 0;
    });
    
    if (urgentBills.length === 0) {
        remindersDiv.innerHTML += '<p style="color:#666;">No urgent reminders at the moment.</p>';
        return;
    }
    
    urgentBills.forEach(bill => {
        const dueStr = bill.recurrence !== 'one-time' ? getNextDueDate(bill) : bill.dueDate;
        const days = daysUntil(dueStr);
        
        const rem = document.createElement('div');
        rem.className = 'reminder';
        rem.innerHTML = `
            <strong>${bill.name}</strong> - ${formatCurrency(bill.amount)}<br>
            Due in ${days} day${days > 1 ? 's' : ''} (${new Date(dueStr).toLocaleDateString()})
        `;
        remindersDiv.appendChild(rem);
    });
}

// Initialize
function init() {
    renderBills(bills);
    updateStats();
    checkReminders();
    
    // Auto refresh reminders every hour
    setInterval(checkReminders, 3600000);
}

init();