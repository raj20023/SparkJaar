document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('waitlist');
    const formContainer = document.getElementById('form-container');
    const resourceContainer = document.getElementById('resource-container');
    const driveLinkBtn = document.getElementById('drive-link');
    const formMessage = document.getElementById('form-message');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('userName');
            const emailInput = document.getElementById('userEmail');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            const nameValue = nameInput.value;
            const emailValue = emailInput.value;
            
            // Basic UI feedback for submission
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Processing...';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;

            // Get resourceSlug from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const resourceSlug = urlParams.get('resource') || urlParams.get('r') || '';

            try {
                const response = await fetch('/api/claim-resource', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ name: nameValue, email: emailValue, resourceSlug })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    formContainer.style.display = 'none';
                    resourceContainer.style.display = 'block';
                    driveLinkBtn.href = data.link;
                } else {
                    throw new Error(data.error || "Form submission failed");
                }
            } catch (error) {
                console.error(error);
                formMessage.innerText = error.message || "Oops! There was a problem. Please try again.";
                formMessage.style.color = "red";
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }
        });
    }
});
