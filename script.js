// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- General UI Enhancements ---
    updateCurrentYear();
    setupPasswordToggles();
    setupFormHandlers();
    setupCountdowns();
    setupSmoothScrolling();
});

function updateCurrentYear() {
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

function setupPasswordToggles() {
    const passwordToggles = [
        { inputId: 'password', toggleId: 'togglePassword' },
        { inputId: 'confirmPassword', toggleId: 'toggleConfirmPassword' }
    ];

    passwordToggles.forEach(({ inputId, toggleId }) => {
        const passwordInput = document.getElementById(inputId);
        const toggleButton = document.getElementById(toggleId);

        if (passwordInput && toggleButton) {
            toggleButton.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                toggleButton.innerHTML = type === 'password' ? 
                    '<i class="fas fa-eye"></i>' : 
                    '<i class="fas fa-eye-slash"></i>';
            });
        }
    });
}

function setupFormHandlers() {
    setupLoginForm();
    setupRegistrationForm();
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
        const rememberMe = loginForm['remember-me']?.checked || false;

        if (!validateLoginForm(email, password)) return;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store token if remember me is checked
            if (rememberMe) {
                localStorage.setItem('token', data.token);
            } else {
                sessionStorage.setItem('token', data.token);
            }

            displayFormMessage('loginMessage', 'Login successful! Redirecting...', 'success');
            
            // Redirect based on account type
            setTimeout(() => {
                window.location.href = `account_${data.user.accountType}.html`;
            }, 1500);

        } catch (error) {
            displayFormMessage('loginMessage', error.message, 'error');
        }
    });
}

function setupRegistrationForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const passwordStrengthIndicator = document.getElementById('passwordStrength');
    const passwordMatchIndicator = document.getElementById('passwordMatch');

    if (!passwordField || !confirmPasswordField || !passwordStrengthIndicator || !passwordMatchIndicator) return;

    // Password strength checker
    passwordField.addEventListener('input', () => {
        const strength = checkPasswordStrength(passwordField.value);
        passwordStrengthIndicator.textContent = `Strength: ${strength.text}`;
        passwordStrengthIndicator.className = `text-xs mt-1 ${strength.colorClass}`;
        validatePasswordsMatch();
    });

    // Confirm password matcher
    confirmPasswordField.addEventListener('input', validatePasswordsMatch);

    function validatePasswordsMatch() {
        if (passwordField.value === confirmPasswordField.value && confirmPasswordField.value.length > 0) {
            passwordMatchIndicator.textContent = 'Passwords match!';
            passwordMatchIndicator.className = 'text-xs mt-1 text-strength-strong';
        } else if (confirmPasswordField.value.length > 0) {
            passwordMatchIndicator.textContent = 'Passwords do not match.';
            passwordMatchIndicator.className = 'text-xs mt-1 text-red-500';
        } else {
            passwordMatchIndicator.textContent = '';
        }
    }

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = {
            fullName: registerForm.fullName.value.trim(),
            email: registerForm.email.value.trim(),
            password: passwordField.value,
            accountType: registerForm.accountType.value,
            termsAgreed: registerForm.terms.checked
        };

        if (!validateRegistrationForm(formData)) return;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            displayFormMessage('registerMessage', 'Registration successful! Redirecting to login...', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            displayFormMessage('registerMessage', error.message, 'error');
        }
    });
}

function validateLoginForm(email, password) {
    if (!email) {
        displayFormMessage('loginMessage', 'Please enter your email.', 'error');
        return false;
    }
    if (!password) {
        displayFormMessage('loginMessage', 'Please enter your password.', 'error');
        return false;
    }
    return true;
}

function validateRegistrationForm(formData) {
    const { fullName, email, password, accountType, termsAgreed } = formData;

    if (!fullName || !email || !password) {
        displayFormMessage('registerMessage', 'Please fill in all required fields.', 'error');
        return false;
    }

    if (password.length < 8) {
        displayFormMessage('registerMessage', 'Password must be at least 8 characters long.', 'error');
        return false;
    }

    if (password !== document.getElementById('confirmPassword').value) {
        displayFormMessage('registerMessage', 'Passwords do not match.', 'error');
        return false;
    }

    if (!termsAgreed) {
        displayFormMessage('registerMessage', 'You must agree to the terms and conditions.', 'error');
        return false;
    }

    return true;
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 1;

    switch (strength) {
        case 5: return { text: 'Very Strong', colorClass: 'text-strength-strong' };
        case 4: return { text: 'Strong', colorClass: 'text-strength-strong' };
        case 3: return { text: 'Medium', colorClass: 'text-strength-medium' };
        case 2: return { text: 'Weak', colorClass: 'text-strength-weak' };
        default: return { text: 'Very Weak', colorClass: 'text-strength-weak' };
    }
}

function displayFormMessage(elementId, message, type = 'info') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.innerHTML = `<p class="${type}">${message}</p>`;
        setTimeout(() => {
            messageElement.innerHTML = '';
        }, 5000);
    }
}

function setupCountdowns() {
    const countdowns = [
        { id: 'countdown1', duration: 8 * 3600 + 15 * 60 + 30 },
        { id: 'countdown2', duration: 12 * 3600 + 45 * 60 + 10 }
    ];

    countdowns.forEach(({ id, duration }) => {
        const element = document.getElementById(id);
        if (element) {
            startCountdown(element, duration);
        }
    });
}

function startCountdown(element, durationInSeconds) {
    let timer = durationInSeconds;
    
    const interval = setInterval(() => {
        if (timer <= 0) {
            element.textContent = "Deal Expired!";
            clearInterval(interval);
            return;
        }

        const hours = Math.floor(timer / 3600);
        const minutes = Math.floor((timer % 3600) / 60);
        const seconds = timer % 60;

        element.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timer--;
    }, 1000);
}

function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute.length > 1 && document.querySelector(hrefAttribute)) {
                e.preventDefault();
                document.querySelector(hrefAttribute).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}
