document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const linkForm = document.getElementById('link-form');
    const passwordInput = document.getElementById('adminPassword');
    const driveLinkInput = document.getElementById('driveLinkInput');
    const emailsTableBody = document.getElementById('emails-table-body');
    const loginError = document.getElementById('login-error');
    const linkStatus = document.getElementById('link-status');
    const logoutBtn = document.getElementById('logout-btn');

    let adminToken = localStorage.getItem('adminToken');

    const showDashboard = async () => {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        await fetchDashboardData();
    };

    const showLogin = () => {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    };

    const verifyToken = async () => {
        if (!adminToken) return showLogin();
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (res.ok) {
                showDashboard();
            } else {
                localStorage.removeItem('adminToken');
                showLogin();
            }
        } catch (error) {
            console.error(error);
            showLogin();
        }
    };

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                driveLinkInput.value = data.currentLink || '';
                
                emailsTableBody.innerHTML = '';
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    const date = new Date(user.date).toLocaleString();
                    row.innerHTML = `
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${date}</td>
                    `;
                    emailsTableBody.appendChild(row);
                });
            } else if (res.status === 401 || res.status === 403) {
                logoutBtn.click();
            }
        } catch (error) {
            console.error(error);
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = passwordInput.value;
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${pwd}` }
            });
            if (res.ok) {
                adminToken = pwd;
                localStorage.setItem('adminToken', pwd);
                loginError.innerText = '';
                passwordInput.value = '';
                showDashboard();
            } else {
                loginError.innerText = 'Incorrect password.';
            }
        } catch (error) {
            loginError.innerText = 'Login failed.';
        }
    });

    linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const link = driveLinkInput.value;
        const submitBtn = linkForm.querySelector('button');
        submitBtn.disabled = true;
        linkStatus.innerText = 'Saving...';
        linkStatus.style.color = 'white';

        try {
            const res = await fetch('/api/admin/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ link })
            });
            if (res.ok) {
                linkStatus.innerText = 'Link updated successfully!';
                linkStatus.style.color = 'green';
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            linkStatus.innerText = 'Error updating link.';
            linkStatus.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => {
        adminToken = null;
        localStorage.removeItem('adminToken');
        showLogin();
    });

    // Init
    verifyToken();
});
