document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('waitlist');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = form.querySelector('input[type="email"]');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            // Basic UI feedback for submission
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Joining...';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;
            
            // Simulate network request
            setTimeout(() => {
                form.innerHTML = '<p style="color: var(--accent-color); font-weight: 600; padding: 1rem 0;">🎉 You\'re on the list! Keep an eye on your inbox.</p>';
            }, 1000);
        });
    }
});
