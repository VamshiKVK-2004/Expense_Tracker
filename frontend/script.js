// script.js

document.addEventListener("DOMContentLoaded", () => {
    // Theme Switcher
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute("data-theme", savedTheme);
        themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
        
        themeToggle.onclick = () => {
            const current = document.documentElement.getAttribute("data-theme");
            const newTheme = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙";
            localStorage.setItem('theme', newTheme);
        };
    }

    // Only run dashboard logic on expense.html
    if (!document.body.classList.contains("dashboard")) return;

    const apiUrl = "http://localhost:5000/api/expenses";
    const authApiUrl = "http://localhost:5000/api/auth";
    const token = localStorage.getItem('token');

    // Redirect to login if no token
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Helper to include auth headers
    const authHeaders = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
    let expenses = [];
    let monthlyGoal = 0;
    let db = null;

    // Initialize IndexedDB for offline storage
    const initDB = () => {
        const request = indexedDB.open('ExpenseTrackerDB', 1);
        request.onerror = () => console.log('IndexedDB error');
        request.onsuccess = () => {
            db = request.result;
            syncOfflineData();
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('expenses')) {
                db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
            }
        };
    };

    // Sync offline data when back online
    const syncOfflineData = async () => {
        if (!db) return;
        const transaction = db.transaction(['expenses'], 'readonly');
        const store = transaction.objectStore('expenses');
        const offlineExpenses = await store.getAll();
        
        if (offlineExpenses.length > 0) {
            for (const expense of offlineExpenses) {
                try {
                    await fetch(apiUrl, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify(expense)
                    });
                } catch (err) {
                    console.log('Failed to sync expense:', err);
                }
            }
            // Clear offline data after sync
            const clearTransaction = db.transaction(['expenses'], 'readwrite');
            const clearStore = clearTransaction.objectStore('expenses');
            clearStore.clear();
        }
    };

    // Store expense offline
    const storeOffline = (expense) => {
        if (!db) return;
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        store.add(expense);
    };

    // Elements
    const expenseForm = document.getElementById("expense-form");
    const expenseList = document.getElementById("expense-list");
    const totalAmount = document.getElementById("total-amount");
    const filterCategory = document.getElementById("filter-category");
    const goalInput = document.getElementById("monthly-goal");
    const goalBar = document.getElementById("goal-progress-bar");
    const goalWarning = document.getElementById("goal-warning");
    const aiSuggestionList = document.getElementById("ai-suggestion-list");
    const exportPdfBtn = document.getElementById("export-pdf");
    const spendingAlert = document.getElementById("spending-alert");

    // Recurring fields
    const recurringCheckbox = document.getElementById("expense-recurring");
    const recurrenceType = document.getElementById("expense-recurrence-type");
    recurringCheckbox.addEventListener("change", () => {
        recurrenceType.disabled = !recurringCheckbox.checked;
    });

    // Fetch all expenses
    async function fetchExpenses() {
        try {
            const res = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${token}` } });
            const data = await res.json();
            expenses = data;
            displayExpenses(expenses);
            updateTotalAmount();
            updateCharts();
            updateGoalProgress();
            updateAISuggestions();
            checkSpendingTrends();
        } catch (err) {
            console.log('Failed to fetch expenses, using offline data');
            // Use offline data if available
            if (db) {
                const transaction = db.transaction(['expenses'], 'readonly');
                const store = transaction.objectStore('expenses');
                const offlineExpenses = await store.getAll();
                expenses = offlineExpenses;
                displayExpenses(expenses);
                updateTotalAmount();
                updateCharts();
                updateGoalProgress();
                updateAISuggestions();
                checkSpendingTrends();
            }
        }
    }

    // Check spending trends and show alerts
    function checkSpendingTrends() {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
        
        const currentMonthTotal = expenses
            .filter(e => (e.date || '').substring(0, 7) === currentMonth)
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        const lastMonthTotal = expenses
            .filter(e => (e.date || '').substring(0, 7) === lastMonth)
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

        if (lastMonthTotal > 0) {
            const increase = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
            if (increase > 30) {
                spendingAlert.classList.remove('hidden');
                spendingAlert.classList.add('show');
                spendingAlert.querySelector('.alert-text').textContent = 
                    `You've spent ${increase.toFixed(1)}% more this month compared to last month!`;
            } else if (increase > 0) {
                spendingAlert.classList.remove('hidden');
                spendingAlert.classList.add('show');
                spendingAlert.querySelector('.alert-text').textContent = 
                    `Your spending is ${increase.toFixed(1)}% higher than last month.`;
            } else {
                spendingAlert.classList.remove('show');
                setTimeout(() => spendingAlert.classList.add('hidden'), 500);
            }
        }
    }

    // Add a new expense
    expenseForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const expense = {
            title: document.getElementById("expense-name").value,
            amount: parseFloat(document.getElementById("expense-amount").value),
            category: document.getElementById("expense-category").value,
            date: document.getElementById("expense-date").value,
            note: document.getElementById("expense-note").value,
            paymentMethod: document.getElementById("expense-payment-method").value,
            isRecurring: recurringCheckbox.checked,
            recurrenceType: recurringCheckbox.checked ? recurrenceType.value : "none"
        };

        try {
            // Save to backend
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(expense)
            });
            
            if (response.ok) {
                expenseForm.reset();
                recurrenceType.disabled = true;
                fetchExpenses();
                
                // Handle recurring expenses
                if (expense.isRecurring && expense.recurrenceType !== "none") {
                    scheduleRecurringExpense(expense);
                }
            }
        } catch (err) {
            console.log('Failed to save expense, storing offline');
            storeOffline(expense);
            expenseForm.reset();
            recurrenceType.disabled = true;
            fetchExpenses();
        }
    });

    // Schedule recurring expenses
    function scheduleRecurringExpense(expense) {
        const nextDate = calculateNextRecurrence(expense.date, expense.recurrenceType);
        if (nextDate) {
            const recurringExpense = {
                ...expense,
                date: nextDate,
                isRecurring: false, // Don't create infinite loop
                recurrenceType: "none"
            };
            
            // Schedule for next occurrence (in real app, use a cron job or scheduler)
            setTimeout(() => {
                fetch(apiUrl, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(recurringExpense)
                }).then(() => fetchExpenses());
            }, 1000); // For demo purposes
        }
    }

    function calculateNextRecurrence(date, type) {
        const currentDate = new Date(date);
        switch (type) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                return null;
        }
        return currentDate.toISOString().substring(0, 10);
    }

    // Delete/Edit handler
    expenseList.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains("delete-btn")) {
            try {
                await fetch(`${apiUrl}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
                fetchExpenses();
            } catch (err) {
                console.log('Failed to delete expense');
            }
        }
        if (e.target.classList.contains("edit-btn")) {
            const expense = expenses.find(exp => exp._id === id);
            document.getElementById("expense-name").value = expense.title;
            document.getElementById("expense-amount").value = expense.amount;
            document.getElementById("expense-category").value = expense.category || "General";
            document.getElementById("expense-date").value = expense.date?.substring(0, 10);
            document.getElementById("expense-note").value = expense.note || "";
            document.getElementById("expense-payment-method").value = expense.paymentMethod || "Cash";
            recurringCheckbox.checked = !!expense.isRecurring;
            recurrenceType.value = expense.recurrenceType || "none";
            recurrenceType.disabled = !expense.isRecurring;
            
            try {
                await fetch(`${apiUrl}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
            } catch (err) {
                console.log('Failed to delete expense for editing');
            }
        }
    });

    // Filter by category
    filterCategory.addEventListener("change", () => {
        const selected = filterCategory.value;
        const filtered = selected === "All" ? expenses : expenses.filter(e => e.category === selected);
        displayExpenses(filtered);
    });

    // Goal tracker
    goalInput.addEventListener("input", () => {
        monthlyGoal = parseFloat(goalInput.value) || 0;
        updateGoalProgress();
    });

    function updateGoalProgress() {
        const month = new Date().toISOString().substring(0, 7);
        const monthExpenses = expenses.filter(e => (e.date || '').substring(0, 7) === month);
        const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        if (monthlyGoal > 0) {
            const percent = Math.min(100, (total / monthlyGoal) * 100);
            goalBar.style.width = percent + "%";
            if (percent > 100) {
                goalWarning.textContent = "Warning: You have exceeded your monthly goal!";
            } else if (percent > 80) {
                goalWarning.textContent = "Caution: You are close to your monthly goal.";
            } else {
                goalWarning.textContent = "";
            }
        } else {
            goalBar.style.width = "0%";
            goalWarning.textContent = "";
        }
    }

    // Display expenses
    function displayExpenses(data) {
        expenseList.innerHTML = "";
        if (!Array.isArray(data)) {
            console.log('displayExpenses: data is not an array:', data);
            return;
        }
        data.forEach(exp => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${exp.title}</td>
                <td>$${parseFloat(exp.amount).toFixed(2)}</td>
                <td>${exp.category || "General"}</td>
                <td>${exp.date ? exp.date.substring(0, 10) : "-"}</td>
                <td>${exp.note || ""}</td>
                <td>${exp.paymentMethod || "Cash"}</td>
                <td>${exp.isRecurring ? exp.recurrenceType : "No"}</td>
                <td>
                    <button class="edit-btn" data-id="${exp._id}">Edit</button>
                    <button class="delete-btn" data-id="${exp._id}">Delete</button>
                </td>
            `;
            expenseList.appendChild(row);
        });
    }

    // Update total amount
    function updateTotalAmount() {
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        totalAmount.textContent = total.toFixed(2);
    }

    // Chart.js charts with improved colors
    let monthlyChart, categoryChart;
    function updateCharts() {
        const colors = ['#1abc9c', '#2980b9', '#27ae60', '#e67e22', '#8e44ad', '#e74c3c', '#f39c12'];
        
        // Monthly Spend Bar
        const months = {};
        expenses.forEach(e => {
            const m = (e.date || '').substring(0, 7);
            months[m] = (months[m] || 0) + parseFloat(e.amount || 0);
        });
        const monthLabels = Object.keys(months).sort();
        const monthData = monthLabels.map(m => months[m]);
        
        if (!monthlyChart) {
            monthlyChart = new Chart(document.getElementById('monthly-spend-chart'), {
                type: 'bar',
                data: { 
                    labels: monthLabels, 
                    datasets: [{ 
                        label: 'Monthly Spend', 
                        data: monthData, 
                        backgroundColor: colors[0],
                        borderColor: colors[0],
                        borderWidth: 2
                    }] 
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        title: { display: true, text: 'Monthly Spending' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        } else {
            monthlyChart.data.labels = monthLabels;
            monthlyChart.data.datasets[0].data = monthData;
            monthlyChart.update();
        }
        
        // Category Pie
        const cats = {};
        expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0); });
        const catLabels = Object.keys(cats);
        const catData = catLabels.map(c => cats[c]);
        
        if (!categoryChart) {
            categoryChart = new Chart(document.getElementById('category-pie-chart'), {
                type: 'pie',
                data: { 
                    labels: catLabels, 
                    datasets: [{ 
                        data: catData, 
                        backgroundColor: colors.slice(0, catLabels.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }] 
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Spending by Category' }
                    }
                }
            });
        } else {
            categoryChart.data.labels = catLabels;
            categoryChart.data.datasets[0].data = catData;
            categoryChart.data.datasets[0].backgroundColor = colors.slice(0, catLabels.length);
            categoryChart.update();
        }
        
        // Trend chart removed
    }

    // Enhanced AI Suggestions
    function updateAISuggestions() {
        aiSuggestionList.innerHTML = "";
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const cats = {};
        expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0); });
        
        const suggestions = [];
        
        // Category-based suggestions
        for (const [cat, amt] of Object.entries(cats)) {
            if (total > 0 && amt / total > 0.3) {
                suggestions.push(`Consider reducing your spending on ${cat} (${(amt / total * 100).toFixed(1)}% of total).`);
            }
        }
        
        // Monthly goal suggestions
        if (monthlyGoal > 0) {
            const currentMonth = new Date().toISOString().substring(0, 7);
            const monthTotal = expenses
                .filter(e => (e.date || '').substring(0, 7) === currentMonth)
                .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            
            if (monthTotal > monthlyGoal) {
                suggestions.push(`You've exceeded your monthly goal by $${(monthTotal - monthlyGoal).toFixed(2)}.`);
            } else if (monthTotal > monthlyGoal * 0.8) {
                suggestions.push(`You're close to your monthly goal. Consider reducing non-essential expenses.`);
            }
        }
        
        // General suggestions
        if (suggestions.length === 0) {
            suggestions.push("Great job managing your expenses! Keep up the good work.");
        }
        
        suggestions.forEach(suggestion => {
            const li = document.createElement("li");
            li.textContent = suggestion;
            aiSuggestionList.appendChild(li);
        });
    }

    // PDF Export functionality
    exportPdfBtn.addEventListener("click", async () => {
        try {
            const response = await fetch(`${apiUrl}/export-pdf`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                    expenses: expenses,
                    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10),
                    endDate: new Date().toISOString().substring(0, 10)
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `expense-summary-${new Date().toISOString().substring(0, 10)}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.log('PDF export failed, using print fallback');
            window.print();
        }
    });

    // Initialize everything
    initDB();
    fetchExpenses();
    
    // Load saved goal from localStorage
    const savedGoal = localStorage.getItem('monthlyGoal');
    if (savedGoal) {
        goalInput.value = savedGoal;
        monthlyGoal = parseFloat(savedGoal);
        updateGoalProgress();
    }
    
    // Save goal to localStorage
    goalInput.addEventListener('change', () => {
        localStorage.setItem('monthlyGoal', goalInput.value);
    });

    // Load current user and set header name
    (async () => {
        try {
            const res = await fetch(`${authApiUrl}/me`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'auth.html';
                return;
            }
            const data = await res.json();
            const userNameEl = document.getElementById('user-name');
            if (userNameEl && data?.user?.name) userNameEl.textContent = data.user.name;
        } catch (e) {
            console.log('Failed to load user');
        }
    })();

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'auth.html';
        });
    }
});

