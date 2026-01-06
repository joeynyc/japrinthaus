'use strict';

/**
 * J&A Printhaus Website - Main JavaScript
 * Handles form validation, navigation, and page interactions
 */

(function() {
    // ==================== MOBILE NAVIGATION ====================

    const navHamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');
    const navMobileOverlay = document.getElementById('navMobileOverlay');
    const body = document.body;

    /**
     * Toggle mobile menu
     */
    function toggleMobileMenu() {
        const isOpen = navHamburger.classList.contains('active');

        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    function openMobileMenu() {
        navHamburger.classList.add('active');
        navHamburger.setAttribute('aria-expanded', 'true');
        navLinks.classList.add('active');
        navMobileOverlay.classList.add('active');
        body.classList.add('menu-open');
    }

    /**
     * Close mobile menu
     */
    function closeMobileMenu() {
        navHamburger.classList.remove('active');
        navHamburger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('active');
        navMobileOverlay.classList.remove('active');
        body.classList.remove('menu-open');
    }

    // Hamburger button click handler
    if (navHamburger) {
        navHamburger.addEventListener('click', toggleMobileMenu);
    }

    // Close menu when clicking overlay
    if (navMobileOverlay) {
        navMobileOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close menu when clicking a nav link
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
    }

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navHamburger && navHamburger.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Close menu on window resize (if resizing to desktop)
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && navHamburger && navHamburger.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // ==================== FORM VALIDATION ====================

    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('form-status');

    // Validation rules
    const validationRules = {
        name: {
            required: true,
            pattern: /^[A-Za-z\s\-']{2,100}$/,
            message: 'Please enter a valid name (letters, spaces, hyphens, apostrophes only)'
        },
        email: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        },
        project_type: {
            required: true,
            pattern: /^[A-Za-z0-9\s\-]{2,100}$/,
            message: 'Please enter a valid project type'
        },
        message: {
            required: true,
            minLength: 10,
            maxLength: 2000,
            message: 'Project description must be between 10 and 2000 characters'
        }
    };

    /**
     * Validate a single form field
     */
    function validateField(fieldName, value) {
        const rule = validationRules[fieldName];
        const errorElement = document.getElementById(`${fieldName}-error`);

        if (!errorElement) return true;

        // Clear previous error
        errorElement.textContent = '';

        // Check if field is required and empty
        if (rule.required && !value.trim()) {
            errorElement.textContent = `${fieldName.replace('_', ' ').charAt(0).toUpperCase() + fieldName.replace('_', ' ').slice(1)} is required`;
            return false;
        }

        // Skip further validation if empty and not required
        if (!value.trim() && !rule.required) {
            return true;
        }

        // Check minimum length
        if (rule.minLength && value.length < rule.minLength) {
            errorElement.textContent = rule.message;
            return false;
        }

        // Check maximum length
        if (rule.maxLength && value.length > rule.maxLength) {
            errorElement.textContent = `${fieldName.replace('_', ' ')} must not exceed ${rule.maxLength} characters`;
            return false;
        }

        // Check pattern
        if (rule.pattern && value.trim() && !rule.pattern.test(value.trim())) {
            errorElement.textContent = rule.message;
            return false;
        }

        return true;
    }

    /**
     * Validate entire form
     */
    function validateForm() {
        const fields = ['name', 'email', 'project_type', 'message'];
        let isValid = true;

        fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            const value = field.value;
            if (!validateField(fieldName, value)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Clear form
     */
    function clearForm() {
        contactForm.reset();
        formStatus.textContent = '';
        formStatus.className = 'form-status';
        document.querySelectorAll('.form-error').forEach(err => err.textContent = '');
    }

    /**
     * Show status message
     */
    function showStatus(message, type = 'success') {
        formStatus.textContent = message;
        formStatus.className = `form-status ${type}`;

        if (type === 'success') {
            setTimeout(() => {
                formStatus.className = 'form-status';
                formStatus.textContent = '';
            }, 5000);
        }
    }

    /**
     * Sanitize input to prevent XSS
     */
    function sanitizeInput(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Handle form submission
     */
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validate form
            if (!validateForm()) {
                showStatus('Please correct the errors above', 'error');
                return;
            }

            // Disable submit button to prevent double submission
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                // Gather form data
                const formData = {
                    name: sanitizeInput(document.getElementById('name').value.trim()),
                    email: sanitizeInput(document.getElementById('email').value.trim()),
                    project_type: sanitizeInput(document.getElementById('project_type').value.trim()),
                    message: sanitizeInput(document.getElementById('message').value.trim()),
                    csrf_token: document.getElementById('csrf_token').value
                };

                // Send form data to server
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': formData.csrf_token
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const result = await response.json();

                // Success response
                showStatus('Thank you! We\'ll contact you soon with a quote.', 'success');
                clearForm();

            } catch (error) {
                console.error('Form submission error:', error);
                showStatus('An error occurred. Please try again or contact us directly at japrinthaus@gmail.com', 'error');
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Request Quote';
            }
        });

        // Add real-time validation to form fields
        document.querySelectorAll('#name, #email, #project_type, #message').forEach(field => {
            field.addEventListener('blur', function() {
                validateField(this.id, this.value);
            });

            field.addEventListener('input', function() {
                // Clear error message when user starts typing
                const errorElement = document.getElementById(`${this.id}-error`);
                if (errorElement && this.value.trim()) {
                    errorElement.textContent = '';
                }
            });
        });
    }

    // ==================== NAVIGATION ====================

    /**
     * Navigation scroll effect
     */
    const nav = document.querySelector('.nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }

    // ==================== SMOOTH SCROLL ====================

    /**
     * Smooth scroll for anchor links
     */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const href = this.getAttribute('href');

            // Validate that href is actually an anchor link
            if (!href || !href.startsWith('#')) {
                return;
            }

            // Sanitize the selector to prevent XSS
            const targetId = href.substring(1);
            if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
                console.error('Invalid target ID');
                return;
            }

            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==================== INTERSECTION OBSERVER ====================

    /**
     * Intersection Observer for scroll animations
     */
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-scroll');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.section-header, .service-card, .portfolio-item, .process-step, .stat-item').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });

    // ==================== STAGGER EFFECTS ====================

    /**
     * Add stagger effect to service cards
     */
    document.querySelectorAll('.service-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    /**
     * Add stagger effect to process steps
     */
    document.querySelectorAll('.process-step').forEach((step, index) => {
        step.style.animationDelay = `${index * 0.15}s`;
    });

})();
