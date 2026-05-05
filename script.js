document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('waitlist');
    
    // TODO: Replace this with your actual Formspree endpoint URL
    const FORMSPREE_URL = 'https://formspree.io/f/mwvyoaqd'; 
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = form.querySelector('input[type="email"]');
            const submitBtn = form.querySelector('button[type="submit"]');
            const emailValue = emailInput.value;
            
            // Basic UI feedback for submission
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Joining...';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;
            
            if (FORMSPREE_URL === 'YOUR_FORMSPREE_ENDPOINT_HERE') {
                alert("Developer Note: Please add your Formspree URL in script.js to receive emails!");
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch(FORMSPREE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email: emailValue })
                });

                if (response.ok) {
                    form.innerHTML = '<p style="color: var(--accent-color); font-weight: 600; padding: 1rem 0;">🎉 You\'re on the list! Keep an eye on your inbox.</p>';
                } else {
                    throw new Error("Form submission failed");
                }
            } catch (error) {
                alert("Oops! There was a problem joining the waitlist. Please try again.");
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }
        });
    }
});
