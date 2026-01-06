# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**J&A Printhaus** is a production-ready static single-page application (SPA) for a direct-to-wall printing service. No build tools, no dependencies—just pure HTML5, CSS3, and vanilla JavaScript deployed directly.

- **Type**: Static SPA (zero framework overhead)
- **Stack**: HTML5 + CSS3 + Vanilla JS
- **Deployment**: GitHub Pages, Netlify, or any static host
- **Key Files**: `index.html`, `js/main.js`, `wall16.png` (hero background), `logo.png`

## Architecture

### Responsive Mobile-First Design
- **Breakpoints**: Mobile (default) → 768px (tablet) → 1024px (desktop)
- **Layout**: CSS Grid and Flexbox with `clamp()` for fluid typography
- **Navigation**: Fixed header with hamburger menu on mobile, horizontal nav on desktop
- **CSS Variables**: Centralized color scheme (`--black`, `--blue`, `--silver`, etc.)

### Core Sections
1. **Hero** - Full-viewport section with background image, tagline, and animated scroll indicator
2. **Services** - 3 service cards with grid layout (responsive: 1→2→3 columns)
3. **Portfolio** - Image grid with overlay effects and hover animations
4. **About** - Company info with statistics
5. **Process** - 4-step timeline
6. **Contact** - Working contact form with validation
7. **Footer** - Branding and social links

### Security Architecture
- **CSP Headers**: Content Security Policy to prevent XSS
- **Form Security**: CSRF token generation, client-side validation, input sanitization
- **Design**: Security-first with comprehensive server configuration guides (SECURITY-HEADERS.md)

### JavaScript (js/main.js)
**Mobile Navigation**:
- Hamburger menu toggle with animated X icon
- Mobile overlay with click-to-close behavior
- Escape key and resize handlers
- Smooth staggered animations for menu items

**Form Handling**:
- Real-time field validation (name, email, project type, message)
- Regex pattern matching and length validation
- Inline error messages and form status display
- CSRF token generation on page load
- Input sanitization to prevent XSS
- Client-side rate limiting (5 submissions per hour using localStorage)
- Countdown timer showing when user can submit again
- Sends to `/api/contact` endpoint (backend not yet implemented)

**Navigation**:
- Smooth scroll behavior for anchor links
- Intersection Observer for scroll animations
- Nav bar styling changes after scroll threshold
- Stagger effects on service cards and process steps

## Common Development Tasks

### Local Development
```bash
# Serve locally (Python)
python -m http.server 8000

# Visit http://localhost:8000
```

No build process required. Edit files directly and refresh browser.

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes to index.html, js/main.js, etc.
# Commit with descriptive messages
git commit -m "Add feature description"

# Push to remote
git push origin feature/your-feature

# Merge to main when ready
git checkout main
git merge feature/your-feature
git push origin main
```

### Testing
- **Security**: Use [securityheaders.com](https://securityheaders.com), [Mozilla Observatory](https://observatory.mozilla.org)
- **Performance**: [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- **SSL**: [SSL Labs](https://www.ssllabs.com/ssltest/)
- **Manual**: Cross-browser testing on mobile/tablet/desktop

## Key Implementation Details

### Mobile Navigation (Hamburger Menu)
Located in `index.html` and `js/main.js`:
- Button with 3 animated lines transforms to X on click
- Slides menu from right side with overlay
- Closes on link click, overlay click, or Escape key
- Desktop: Hidden, shows traditional horizontal nav

### Form Validation
In `js/main.js` - `validateField()` function:
- Name: Allows letters, spaces, hyphens, apostrophes (2-100 chars)
- Email: Standard email regex
- Project Type: Alphanumeric, spaces, hyphens (2-100 chars)
- Message: 10-2000 characters

Validation runs on blur and input (real-time feedback).

### Rate Limiting (Client-Side)
In `js/main.js` - Rate limiting functions:
- **Configuration**: 5 submissions per 1-hour rolling window
- **Storage**: Uses browser localStorage with key `form_submissions`
- **Implementation**:
  - `checkRateLimit()` - Validates if submission is allowed
  - `recordSubmission()` - Tracks submission timestamp after success
  - `cleanupOldSubmissions()` - Removes entries older than 1 hour
  - `showRateLimitMessage()` - Displays countdown timer (updates every second)
- **Features**:
  - Countdown timer shows exact time until form re-enables
  - Checks on page load and before each submission
  - Prevents submission if limit exceeded
  - Automatically cleans up expired entries
  - Data validated to prevent corrupted localStorage
  - Multiple interval leak prevention
- **UX**: When limit reached, button text changes to "Limit Reached" and countdown displays
- **Note**: This is a client-side enhancement. Implement server-side rate limiting for production security.

### Color Scheme
```css
--black: #000000
--dark-gray: #141414
--silver: #c4c4c4
--blue: #2323ff (primary brand)
--bright-blue: #4444ff (hover)
--white: #ffffff
```

### Typography
- **Oswald** (headings, nav, labels) - bold, uppercase
- **Inter** (body text) - clean, readable

## File Organization

```
/home/zerocool/printhaus/
├── index.html                 # Main HTML (all styles, structure)
├── js/main.js                 # Core JavaScript logic
├── wall16.png                 # Hero background image (3.2MB)
├── logo.png                   # Brand logo (481KB)
├── robots.txt                 # SEO crawl directives
├── sitemap.xml                # XML sitemap for search engines
├── SECURITY-HEADERS.md        # Server security config (Nginx/Apache/Node/PHP)
├── PERFORMANCE_OPTIMIZATION.md # Perf tuning strategies
├── GZIP_COMPRESSION_GUIDE.md  # Compression setup
├── LIGHTHOUSE_CHECKLIST.md    # Performance metrics
└── README.md                  # Project documentation
```

## Editing Guidelines

### UI Changes & Styling (IMPORTANT)
⚠️ **ALWAYS use the Frontend Design skill for ANY UI/styling changes:**
```
Use: Skill tool with "frontend-design:frontend-design"
```
This ensures all visual changes maintain production-grade quality, consistency, and aesthetic coherence. Examples:
- Adding or modifying components
- Changing colors, typography, or spacing
- Creating animations or transitions
- Adjusting layouts or responsive behavior
- Updating hero section, buttons, forms, etc.

The skill provides creative direction, production-grade implementation, and prevents generic "AI slop" aesthetics.

### Modifying index.html
- **Styles**: Edit `<style>` section directly (no separate CSS file)
- **HTML**: Update content within semantic sections
- **Mobile First**: Always test with browser DevTools at 375px width
- **Responsive**: Verify changes at 768px and 1024px breakpoints

### Modifying js/main.js
- **Mobile Menu**: Functions at top - `toggleMobileMenu()`, `openMobileMenu()`, `closeMobileMenu()`
- **Form Validation**: `validateField()` and `validateForm()` functions
- **Rate Limiting**: `checkRateLimit()`, `recordSubmission()`, `cleanupOldSubmissions()`, `showRateLimitMessage()`
- **Navigation**: Scroll effects and smooth scroll behavior below
- **Intersection Observer**: Scroll animation triggers at bottom

### Adding New Sections
1. Add HTML structure to `index.html`
2. Add CSS styles within `<style>` section
3. Add responsive breakpoints at 768px and 1024px
4. Use CSS variables for colors
5. Test on mobile, tablet, and desktop

## Backend Implementation (For Future)

### Contact Form Endpoint
Form expects `POST /api/contact` with JSON:
```json
{
  "name": "string",
  "email": "string",
  "project_type": "string",
  "message": "string",
  "csrf_token": "string"
}
```

See `SECURITY-HEADERS.md` for full backend implementation examples (Node.js, PHP).

### Requirements
- CSRF token validation
- Input sanitization (SQL injection, XSS prevention)
- Email validation and sending
- Rate limiting (5 requests/hour per IP)
- Database storage with prepared statements
- Error handling and logging

## Deployment

### GitHub Pages (Current)
```bash
git push origin main
# Auto-deploys to https://joeynyc.github.io/japrinthaus/
```

### Static Hosting (Netlify, Vercel, etc.)
1. Push to GitHub
2. Connect repository
3. Set build command: (none needed)
4. Set publish directory: `/` (root)
5. Deploy

### Traditional Web Server
Copy all files to web root. Ensure `wall16.png` and `logo.png` are present.

### Server Security Headers (Required)
See `SECURITY-HEADERS.md` for configuration:
- Nginx (add_header directives)
- Apache (.htaccess)
- Express/Node.js (helmet middleware)
- PHP (header() function)

## Known Limitations & TODOs

- **Form Backend**: Currently only client-side validation. Backend `/api/contact` not implemented.
- **Server-Side Rate Limiting**: Client-side rate limiting implemented (localStorage). Implement server-side rate limiting for production.
- **Email**: No email notifications configured
- **Database**: No form data storage
- **Analytics**: Google Analytics not integrated
- **Testing**: No automated test suite

## Performance Notes

- **Images**: `wall16.png` is 3.2MB - consider optimization or lazy loading if performance issues
- **Fonts**: Google Fonts preconnected for faster loading
- **Minification**: `styles.min.css` and `script.min.js` available (not currently used)
- **Lighthouse**: Check LIGHTHOUSE_CHECKLIST.md for performance metrics

## Recent Changes (Latest Commits)

- `de6a774` - Fix critical rate limiting issues and add data validation (countdown timer leak prevention, localStorage validation)
- `4e815d0` - Add frontend design skill requirement to CLAUDE.md
- `15cb938` - Fix hero background image path to use local wall16.png
- `2ea8bad` - Add mobile hamburger menu, security hardening, form validation

## References

- **Git Repo**: `joeynyc/japrinthaus` on GitHub
- **Current Branch**: `main`
- **Live Site**: https://joeynyc.github.io/japrinthaus/
- **Company Email**: japrinthaus@gmail.com
- **Contact**: Jaime Maya (508-851-0997), Antonio Velazquez (347-998-4933)

---

**For questions about architecture, security, or deployment, see the detailed documentation files (SECURITY-HEADERS.md, PERFORMANCE_OPTIMIZATION.md, etc.).**
