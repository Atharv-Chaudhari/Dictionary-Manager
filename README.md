# 📚 Dictionary Manager

A beautiful, auto-syncing dictionary manager that works with GitHub Pages.

## Features

- ✅ Add, edit, delete words
- ✅ Auto-sync to GitHub
- ✅ Load from GitHub on startup
- ✅ Dark/Light theme
- ✅ Search and filter
- ✅ Statistics tracking
- ✅ GitHub Pages hosting

## Setup

1. **Enable GitHub Pages**:
   - Go to Repository Settings → Pages
   - Source: "GitHub Actions"
   - Save

2. **The workflows will automatically**:
   - Deploy to GitHub Pages on push
   - Auto-sync dictionary every hour
   - Process new words from issues

## Usage

1. Visit your GitHub Pages URL: `https://atharv-chaudhari.github.io/Dictionary-Manager/`
2. Add words using the interface
3. Words auto-save to localStorage
4. Auto-sync to GitHub happens automatically

## GitHub Integration

- Words sync via GitHub Issues
- Each word creates an issue
- GitHub Actions processes issues
- Dictionary updates automatically

## Development

```bash
# Clone the repo
git clone https://github.com/Atharv-Chaudhari/Dictionary-Manager.git

# Files:
index.html      # Main page
style.css       # Styles
dictionary.js   # Logic
.github/workflows/ # GitHub Actions
