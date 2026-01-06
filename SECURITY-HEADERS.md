# J&A Printhaus - Security Configuration Guide

This document provides instructions for implementing additional security measures on your web server.

## Overview

The website now includes:
- ✅ Client-side form validation with CSRF tokens
- ✅ Content Security Policy (CSP) meta tags
- ✅ Additional security meta tags (X-Frame-Options, X-Content-Type-Options, etc.)
- ⚠️ Server-side configurations (requires web server setup)

## Server Security Headers Configuration

For best security, implement these HTTP headers on your web server. Choose the appropriate configuration for your server type.

### Nginx Configuration

Add these headers to your Nginx server block configuration:

```nginx
server {
    # ... other nginx config ...

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # HSTS (only if using HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Content Security Policy (more strict server version - replaces meta tags)
    # Uncomment after testing: add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # ... rest of your nginx config ...
}
```

### Apache Configuration

Add these to your `.htaccess` file or Apache VirtualHost:

```apache
# Enable mod_headers (if not already enabled)
# a2enmod headers

<IfModule mod_headers.c>
    # Security Headers
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # HSTS (only if using HTTPS - enable gradually)
    # Start with 300 seconds for testing
    # Header always set Strict-Transport-Security "max-age=300; includeSubDomains"
    # After testing, use full year
    # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Remove server identification
    Header always unset Server
    Header unset X-Powered-By
    Header always unset X-Powered-By
</IfModule>

# Disable directory listing
Options -Indexes

# Enable GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Set proper content types
<IfModule mod_mime.c>
    AddType application/javascript js
    AddType application/json json
</IfModule>

# Redirect HTTP to HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

### Express.js (Node.js) Configuration

If using Express.js, install and use the `helmet` middleware:

```bash
npm install helmet
```

```javascript
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Apply Helmet security headers middleware
app.use(helmet());

// Custom CSP that allows inline scripts (if needed during development)
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
    }
}));

// Enable HTTPS only redirect
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
});

// ... rest of your Express config ...
```

## Form Submission Backend Implementation

### Node.js/Express Backend Example

```javascript
const express = require('express');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '10kb' }));

// Rate limiting: max 5 form submissions per hour per IP
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many contact form submissions, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// In-memory CSRF token store (use Redis in production)
const csrfTokens = new Map();

/**
 * Generate CSRF token endpoint
 */
app.get('/api/csrf-token', (req, res) => {
    const token = 'csrf_' + Math.random().toString(36).substr(2, 20);
    csrfTokens.set(token, true);

    // Token expires in 1 hour
    setTimeout(() => csrfTokens.delete(token), 3600000);

    res.json({ csrf_token: token });
});

/**
 * Contact form submission endpoint
 */
app.post('/api/contact', contactLimiter, (req, res) => {
    const { name, email, project_type, message, csrf_token } = req.body;

    // Validate CSRF token
    if (!csrf_token || !csrfTokens.has(csrf_token)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    csrfTokens.delete(csrf_token); // Use token only once

    // Validate required fields
    if (!name || !email || !project_type || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate and sanitize inputs
    try {
        const sanitizedData = {
            name: validator.escape(validator.trim(name)).substring(0, 100),
            email: validator.normalizeEmail(email),
            project_type: validator.escape(validator.trim(project_type)).substring(0, 100),
            message: validator.escape(validator.trim(message)).substring(0, 2000)
        };

        // Validate email format
        if (!validator.isEmail(sanitizedData.email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Validate name format
        if (!/^[A-Za-z\s\-']{2,100}$/.test(sanitizedData.name)) {
            return res.status(400).json({ error: 'Invalid name format' });
        }

        // Validate message length
        if (sanitizedData.message.length < 10) {
            return res.status(400).json({ error: 'Message is too short' });
        }

        // TODO: Store in database using ORM with parameterized queries
        // Example with MongoDB/Mongoose:
        // const ContactSubmission = require('./models/ContactSubmission');
        // const submission = new ContactSubmission(sanitizedData);
        // await submission.save();

        // Send email notification to business
        sendEmailNotification(sanitizedData);

        // Send confirmation email to user
        sendConfirmationEmail(sanitizedData.email);

        res.status(200).json({
            success: true,
            message: 'Thank you! We will contact you soon.'
        });

    } catch (error) {
        console.error('Form validation error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

/**
 * Send email notification to business
 */
async function sendEmailNotification(data) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'japrinthaus@gmail.com',
        subject: `New Contact Form Submission: ${data.project_type}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Project Type:</strong> ${data.project_type}</p>
            <p><strong>Message:</strong></p>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Notification email sent');
    } catch (error) {
        console.error('Error sending notification email:', error);
    }
}

/**
 * Send confirmation email to user
 */
async function sendConfirmationEmail(userEmail) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'We received your quote request - J&A PrintHaus',
        html: `
            <h2>Thank You!</h2>
            <p>We've received your quote request and will get back to you within 24 hours.</p>
            <p>You can also reach us at:</p>
            <p>📧 japrinthaus@gmail.com</p>
            <p>📱 Jaime Maya: 508-851-0997</p>
            <p>📱 Antonio Velazquez: 347-998-4933</p>
            <p>Best regards,<br>J&A PrintHaus Team</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent to user');
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Environment Variables

Create a `.env` file with:

```env
NODE_ENV=production
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
CSRF_SECRET=your-long-random-secret-key
DATABASE_URL=your-database-connection-url
```

## PHP Backend Example

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('X-Content-Type-Options: nosniff');

// Enable error logging (don't display errors)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php-errors.log');

// CSRF Token validation
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Validate CSRF token
$inputData = json_decode(file_get_contents('php://input'), true);
$csrfToken = $inputData['csrf_token'] ?? '';

if (!isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

// Rate limiting
if (!isset($_SESSION['form_submissions'])) {
    $_SESSION['form_submissions'] = [];
}

$clientIp = $_SERVER['REMOTE_ADDR'];
$currentTime = time();
$_SESSION['form_submissions'][$clientIp] = $_SESSION['form_submissions'][$clientIp] ?? [];

// Remove submissions older than 1 hour
$_SESSION['form_submissions'][$clientIp] = array_filter(
    $_SESSION['form_submissions'][$clientIp],
    fn($time) => $currentTime - $time < 3600
);

if (count($_SESSION['form_submissions'][$clientIp]) >= 5) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many submissions. Please try again later.']);
    exit;
}

// Validate and sanitize input
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$projectType = trim($_POST['project_type'] ?? '');
$message = trim($_POST['message'] ?? '');

// Validation
$errors = [];

if (empty($name)) {
    $errors['name'] = 'Name is required';
} elseif (!preg_match("/^[A-Za-z\s\-']{2,100}$/", $name)) {
    $errors['name'] = 'Invalid name format';
}

if (empty($email)) {
    $errors['email'] = 'Email is required';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid email address';
}

if (empty($projectType)) {
    $errors['project_type'] = 'Project type is required';
} elseif (!preg_match("/^[A-Za-z0-9\s\-]{2,100}$/", $projectType)) {
    $errors['project_type'] = 'Invalid project type';
}

if (empty($message)) {
    $errors['message'] = 'Message is required';
} elseif (strlen($message) < 10 || strlen($message) > 2000) {
    $errors['message'] = 'Message must be between 10 and 2000 characters';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
}

// Sanitize inputs
$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$projectType = htmlspecialchars($projectType, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// TODO: Store in database using prepared statements
// $stmt = $pdo->prepare('INSERT INTO contact_submissions (name, email, project_type, message) VALUES (?, ?, ?, ?)');
// $stmt->execute([$name, $email, $projectType, $message]);

// Send email
$to = 'japrinthaus@gmail.com';
$subject = "New Contact Form Submission: $projectType";
$emailBody = "Name: $name\nEmail: $email\nProject Type: $projectType\n\nMessage:\n$message";

$headers = "From: noreply@japrinthaus.com\r\nReply-To: $email";

mail($to, $subject, $emailBody, $headers);

// Send confirmation to user
$confirmationBody = "Thank you for contacting J&A PrintHaus!\n\nWe'll get back to you within 24 hours.\n\nBest regards,\nJ&A PrintHaus Team";
mail($email, "We received your quote request", $confirmationBody, "From: noreply@japrinthaus.com");

// Record submission for rate limiting
$_SESSION['form_submissions'][$clientIp][] = $currentTime;

echo json_encode([
    'success' => true,
    'message' => 'Thank you! We will contact you soon.'
]);
?>
```

## Testing Your Security Configuration

### Online Tools
1. **Security Headers Check**: https://securityheaders.com
2. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
3. **Mozilla Observatory**: https://observatory.mozilla.org
4. **CSP Evaluator**: https://csp-evaluator.withgoogle.com

### Local Testing with curl
```bash
# Check security headers
curl -I https://japrinthaus.com

# Check CSP policy
curl -I https://japrinthaus.com | grep Content-Security-Policy
```

## Deployment Checklist

- [ ] Implement server security headers (Nginx/Apache/Node.js)
- [ ] Set up HTTPS with SSL certificate
- [ ] Implement form submission backend
- [ ] Configure email service for notifications
- [ ] Set up environment variables
- [ ] Enable GZIP compression
- [ ] Test all security headers
- [ ] Verify form validation works
- [ ] Set up error logging
- [ ] Configure rate limiting
- [ ] Test with online security tools
- [ ] Review logs regularly for attacks

## Support

For questions or issues, contact:
- Email: japrinthaus@gmail.com
- Jaime Maya: 508-851-0997
- Antonio Velazquez: 347-998-4933
