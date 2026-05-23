document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const linkForm = document.getElementById('link-form');
    const resourceForm = document.getElementById('resource-form');
    const passwordInput = document.getElementById('adminPassword');
    const driveLinkInput = document.getElementById('driveLinkInput');
    const emailsTableBody = document.getElementById('emails-table-body');
    const resourcesTableBody = document.getElementById('resources-table-body');
    const loginError = document.getElementById('login-error');
    const linkStatus = document.getElementById('link-status');
    const resourceStatus = document.getElementById('resource-status');
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
                        <td>${user.resourceSlug || 'default'}</td>
                        <td>${date}</td>
                    `;
                    emailsTableBody.appendChild(row);
                });

                resourcesTableBody.innerHTML = '';
                if (data.resources) {
                    data.resources.forEach(res => {
                        const row = document.createElement('tr');
                        const shareableUrl = `${window.location.origin}/?resource=${encodeURIComponent(res.slug)}`;
                        row.innerHTML = `
                            <td>
                                <strong>${res.slug}</strong><br>
                                <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                                    <input type="text" value="${shareableUrl}" readonly style="font-size: 0.8em; padding: 2px 5px; background: rgba(0,0,0,0.1); border: 1px solid #ccc; width: 250px;">
                                    <button class="btn btn-outline" style="padding: 2px 5px; font-size: 0.8em;" onclick="navigator.clipboard.writeText('${shareableUrl}'); alert('Link copied to clipboard!')">Copy</button>
                                </div>
                            </td>
                            <td><a href="${res.driveUrl}" target="_blank">Drive Link</a></td>
                            <td><button class="btn btn-outline" style="padding: 5px 10px; color: red; border-color: red;" onclick="deleteResource('${res.slug}')">Delete</button></td>
                        `;
                        resourcesTableBody.appendChild(row);
                    });
                }
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

    resourceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const slug = document.getElementById('resourceSlug').value.trim();
        const driveUrl = document.getElementById('resourceUrl').value.trim();
        const submitBtn = resourceForm.querySelector('button');
        
        submitBtn.disabled = true;
        resourceStatus.innerText = 'Adding...';
        resourceStatus.style.color = 'white';

        try {
            const res = await fetch('/api/admin/resource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ slug, driveUrl })
            });
            const data = await res.json();
            if (res.ok) {
                resourceStatus.innerText = 'Resource added successfully!';
                resourceStatus.style.color = 'green';
                document.getElementById('resourceSlug').value = '';
                document.getElementById('resourceUrl').value = '';
                fetchDashboardData();
            } else {
                throw new Error(data.error || 'Failed to add resource');
            }
        } catch (error) {
            resourceStatus.innerText = error.message;
            resourceStatus.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
        }
    });

    window.deleteResource = async (slug) => {
        if (!confirm(`Are you sure you want to delete the resource '${slug}'?`)) return;
        try {
            const res = await fetch(`/api/admin/resource/${slug}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            if (res.ok) {
                fetchDashboardData();
            } else {
                alert('Failed to delete resource');
            }
        } catch (err) {
            alert('Error deleting resource');
        }
    };

    logoutBtn.addEventListener('click', () => {
        adminToken = null;
        localStorage.removeItem('adminToken');
        showLogin();
    });

    // Init
    verifyToken();
});
