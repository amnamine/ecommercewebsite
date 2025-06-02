// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- General UI Enhancements ---

    // Update current year in footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- Password Visibility Toggle ---
    function setupPasswordToggle(inputId, toggleButtonId) {
        const passwordInput = document.getElementById(inputId);
        const toggleButton = document.getElementById(toggleButtonId);

        if (passwordInput && toggleButton) {
            toggleButton.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                // Change icon
                toggleButton.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }
    }

    // Setup for login page
    setupPasswordToggle('password', 'togglePassword');
    // Setup for register page
    setupPasswordToggle('password', 'togglePasswordRegister'); // Assuming 'password' is the ID for the main password field
    // If you have a separate toggle for confirmPassword, you'd set that up too.
    // setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');


    // --- Login Form Handling ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent actual form submission
            const email = loginForm.email.value;
            // Basic validation (more can be added)
            if (!email) {
                displayFormMessage('loginMessage', 'Please enter your email.', 'error');
                return;
            }
            // Simulate login
            displayFormMessage('loginMessage', 'Login successful! Redirecting...', 'success');
            console.log('Login form submitted with:', {
                email: email,
                password: loginForm.password.value, // In a real app, never log passwords
                rememberMe: loginForm['remember-me'] ? loginForm['remember-me'].checked : false
            });
            // Simulate redirect after a short delay
            setTimeout(() => {
                // window.location.href = 'index.html'; // Or to a dashboard page
                displayFormMessage('loginMessage', 'Redirect would happen here.', 'success');
            }, 1500);
        });
    }

    // --- Registration Form Handling ---
    const registerForm = document.getElementById('registerForm');
    const passwordField = document.getElementById('password'); // Re-get for register form context
    const confirmPasswordField = document.getElementById('confirmPassword');
    const passwordStrengthIndicator = document.getElementById('passwordStrength');
    const passwordMatchIndicator = document.getElementById('passwordMatch');

    if (registerForm && passwordField && confirmPasswordField && passwordStrengthIndicator && passwordMatchIndicator) {
        // Password Strength Checker
        passwordField.addEventListener('input', () => {
            const strength = checkPasswordStrength(passwordField.value);
            passwordStrengthIndicator.textContent = `Strength: ${strength.text}`;
            passwordStrengthIndicator.className = `text-xs mt-1 ${strength.colorClass}`;
            validatePasswordsMatch(); // Also check match when main password changes
        });

        // Confirm Password Matcher
        confirmPasswordField.addEventListener('input', validatePasswordsMatch);

        function validatePasswordsMatch() {
            if (passwordField.value === confirmPasswordField.value && confirmPasswordField.value.length > 0) {
                passwordMatchIndicator.textContent = 'Passwords match!';
                passwordMatchIndicator.className = 'text-xs mt-1 text-strength-strong'; // Green
            } else if (confirmPasswordField.value.length > 0) {
                passwordMatchIndicator.textContent = 'Passwords do not match.';
                passwordMatchIndicator.className = 'text-xs mt-1 text-red-500'; // Red
            } else {
                passwordMatchIndicator.textContent = ''; // Clear if confirm field is empty
            }
        }

        registerForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent actual form submission

            const fullName = registerForm.fullName.value;
            const email = registerForm.email.value;
            const password = passwordField.value;
            const accountType = registerForm.accountType.value;
            const termsAgreed = registerForm.terms.checked;

            // Validations
            if (!fullName || !email || !password || !confirmPasswordField.value) {
                 displayFormMessage('registerMessage', 'Please fill in all required fields.', 'error');
                 return;
            }
            if (password.length < 8) {
                displayFormMessage('registerMessage', 'Password must be at least 8 characters long.', 'error');
                return;
            }
            if (password !== confirmPasswordField.value) {
                displayFormMessage('registerMessage', 'Passwords do not match.', 'error');
                validatePasswordsMatch(); // Ensure visual indicator is also updated
                return;
            }
            if (!termsAgreed) {
                displayFormMessage('registerMessage', 'You must agree to the terms and conditions.', 'error');
                return;
            }

            // Simulate registration
            displayFormMessage('registerMessage', 'Registration successful! Please login.', 'success');
            console.log('Registration form submitted with:', {
                fullName,
                email,
                accountType,
                // password (never log in real app)
            });
            // Simulate redirect or clear form
            setTimeout(() => {
                // registerForm.reset();
                // passwordStrengthIndicator.textContent = '';
                // passwordMatchIndicator.textContent = '';
                // window.location.href = 'login.html';
                 displayFormMessage('registerMessage', 'Redirect to login would happen here.', 'success');
            }, 2000);
        });
    }

    function checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (password.match(/[a-z]/)) strength += 1;
        if (password.match(/[A-Z]/)) strength += 1;
        if (password.match(/[0-9]/)) strength += 1;
        if (password.match(/[^a-zA-Z0-9]/)) strength += 1; // Special character

        switch (strength) {
            case 5: return { text: 'Very Strong', colorClass: 'text-strength-strong' };
            case 4: return { text: 'Strong', colorClass: 'text-strength-strong' };
            case 3: return { text: 'Medium', colorClass: 'text-strength-medium' };
            case 2: return { text: 'Weak', colorClass: 'text-strength-weak' };
            default: return { text: 'Very Weak', colorClass: 'text-strength-weak' };
        }
    }


    // --- Form Message Display Utility ---
    function displayFormMessage(elementId, message, type = 'info') {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.innerHTML = `<p class="${type}">${message}</p>`; // type can be 'success' or 'error' to match CSS
            // Clear message after some time
            setTimeout(() => {
                // messageElement.innerHTML = ''; // Optionally clear
            }, 5000);
        }
    }


    // --- Deal Countdown Timers (Placeholder) ---
    function startCountdown(elementId, durationInSeconds) {
        const countdownElement = document.getElementById(elementId);
        if (!countdownElement) return;

        let timer = durationInSeconds;
        setInterval(() => {
            if (timer <= 0) {
                countdownElement.textContent = "Deal Expired!";
                return;
            }
            const hours = Math.floor(timer / 3600);
            const minutes = Math.floor((timer % 3600) / 60);
            const seconds = timer % 60;

            countdownElement.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timer--;
        }, 1000);
    }

    // Example countdowns (replace with actual deal end times from a server)
    // These are just fixed durations for demonstration
    if (document.getElementById('countdown1')) {
        startCountdown('countdown1', 8 * 3600 + 15 * 60 + 30); // 08:15:30
    }
    if (document.getElementById('countdown2')) {
        startCountdown('countdown2', 12 * 3600 + 45 * 60 + 10); // 12:45:10
    }

    // --- Mobile Menu Toggle (if you add one later) ---
    // const mobileMenuButton = document.getElementById('mobile-menu-button');
    // const mobileMenu = document.getElementById('mobile-menu');
    // if (mobileMenuButton && mobileMenu) {
    //     mobileMenuButton.addEventListener('click', () => {
    //         mobileMenu.classList.toggle('hidden');
    //     });
    // }

    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            // Ensure it's not just a "#" link or a link to an element that doesn't exist.
            if (hrefAttribute.length > 1 && document.querySelector(hrefAttribute)) {
                e.preventDefault();
                document.querySelector(hrefAttribute).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

});
