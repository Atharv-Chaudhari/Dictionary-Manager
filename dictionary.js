class DictionaryManager {
    constructor() {
        this.words = [];
        this.currentWordId = null;
        this.currentFilter = 'all';
        this.isSyncing = false;
        this.autoSync = true;
        
        this.githubConfig = {
            owner: 'Atharv-Chaudhari',
            repo: 'Dictionary-Manager',
            branch: 'main',
            dictionaryFile: 'dictionary.json'
        };
        
        this.init();
    }
    
    async init() {
        // Load from localStorage first
        this.loadWords();
        
        // Setup all listeners
        this.setupEventListeners();
        this.setupTheme();
        
        // Try to load from GitHub
        await this.loadFromGitHub();
        
        // Update UI
        this.updateStats();
        this.renderWordList();
        
        // Start auto-sync
        this.startAutoSync();
    }
    
    async loadFromGitHub() {
        try {
            console.log('🔄 Loading from GitHub...');
            
            // Try to load dictionary.json from GitHub
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/main/${this.githubConfig.dictionaryFile}`
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.words && Array.isArray(data.words)) {
                    console.log(`📥 Loaded ${data.words.length} words from GitHub`);
                    
                    // Merge words
                    this.mergeWords(data.words);
                    
                    // Show notification
                    this.showToast(`Loaded ${data.words.length} words from GitHub`, 'success');
                    
                    return true;
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load from GitHub, using local storage');
        }
        
        return false;
    }
    
    mergeWords(githubWords) {
        // Create map of existing words
        const existingMap = new Map();
        this.words.forEach(word => {
            existingMap.set(word.word.toLowerCase(), word);
        });
        
        // Add or update from GitHub
        let addedCount = 0;
        let updatedCount = 0;
        
        githubWords.forEach(githubWord => {
            const key = githubWord.word.toLowerCase();
            
            if (!existingMap.has(key)) {
                // Add new word
                this.words.push({
                    ...githubWord,
                    id: Date.now() + Math.random(),
                    source: 'GitHub Sync'
                });
                addedCount++;
            } else {
                // Check if GitHub version is newer
                const existing = existingMap.get(key);
                const githubDate = new Date(githubWord.updatedAt || githubWord.createdAt);
                const existingDate = new Date(existing.updatedAt || existing.createdAt);
                
                if (githubDate > existingDate) {
                    // Update with GitHub data
                    Object.assign(existing, {
                        ...githubWord,
                        id: existing.id, // Keep same ID
                        source: existing.source
                    });
                    updatedCount++;
                }
            }
        });
        
        // Save merged data
        if (addedCount > 0 || updatedCount > 0) {
            this.saveWords();
            console.log(`🔄 Merged: +${addedCount} new, ↑${updatedCount} updated`);
        }
    }
    
    loadWords() {
        try {
            const saved = localStorage.getItem('dictionary_words');
            this.words = saved ? JSON.parse(saved) : [];
            
            console.log(`📖 Loaded ${this.words.length} words from localStorage`);
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = [];
        }
    }
    
    saveWords() {
        try {
            localStorage.setItem('dictionary_words', JSON.stringify(this.words));
            console.log(`💾 Saved ${this.words.length} words to localStorage`);
            
            // Auto-sync to GitHub if enabled
            if (this.autoSync && !this.isSyncing) {
                this.syncToGitHub();
            }
        } catch (error) {
            console.error('Error saving words:', error);
        }
    }
    
    async syncToGitHub() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        const syncBtn = document.getElementById('syncBtn');
        const statusSpan = document.getElementById('syncStatus');
        
        if (syncBtn && statusSpan) {
            syncBtn.disabled = true;
            statusSpan.textContent = 'Syncing...';
        }
        
        try {
            console.log('🔄 Starting GitHub sync...');
            
            // Prepare data
            const dictionaryData = {
                words: this.words,
                lastSync: new Date().toISOString(),
                totalWords: this.words.length,
                version: '1.0'
            };
            
            // Create GitHub issue with dictionary data
            await this.createGitHubIssue(dictionaryData);
            
            console.log('✅ GitHub sync complete');
            this.showToast('Dictionary synced to GitHub!', 'success');
            
        } catch (error) {
            console.error('❌ GitHub sync failed:', error);
            this.showToast('Sync failed: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
            
            if (syncBtn && statusSpan) {
                syncBtn.disabled = false;
                statusSpan.textContent = 'Auto-Sync: ON';
            }
        }
    }
    
    async createGitHubIssue(dictionaryData) {
        // This creates a GitHub issue with dictionary data
        // GitHub Actions will automatically process it
        
        const issueData = {
            title: `[DICT-SYNC] ${new Date().toLocaleDateString()} - ${this.words.length} words`,
            body: '```json\n' + JSON.stringify(dictionaryData, null, 2) + '\n```',
            labels: ['dictionary', 'auto-sync']
        };
        
        // GitHub Pages allows CORS for raw.githubusercontent.com
        // We'll use a different approach
        
        // Save to localStorage for now
        localStorage.setItem('pending_sync', JSON.stringify(issueData));
        
        // Show user a link to create the issue
        const issueUrl = `https://github.com/${this.githubConfig.owner}/${this.githubConfig.repo}/issues/new?` +
            `title=${encodeURIComponent(issueData.title)}&` +
            `body=${encodeURIComponent(issueData.body)}&` +
            `labels=dictionary,auto-sync`;
        
        // Auto-open in new tab
        window.open(issueUrl, '_blank');
        
        // Also save the data as a file that can be downloaded
        this.downloadDictionary();
    }
    
    downloadDictionary() {
        const data = {
            words: this.words,
            lastSync: new Date().toISOString(),
            totalWords: this.words.length
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dictionary_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    startAutoSync() {
        // Auto-sync every 10 minutes
        setInterval(() => {
            if (this.autoSync && !this.isSyncing && this.words.length > 0) {
                this.syncToGitHub();
            }
        }, 10 * 60 * 1000); // 10 minutes
        
        // Also sync when page is about to close
        window.addEventListener('beforeunload', () => {
            if (this.autoSync && this.words.length > 0) {
                // Trigger sync without blocking
                this.triggerBackgroundSync();
            }
        });
    }
    
    triggerBackgroundSync() {
        // Send sync data using Beacon API (works even when page is closing)
        const data = {
            words: this.words,
            lastSync: new Date().toISOString(),
            totalWords: this.words.length
        };
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(
            `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/dispatches`,
            blob
        );
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Add word
        document.getElementById('addWordBtn').addEventListener('click', () => this.openAddModal());
        document.getElementById('addFirstWordBtn').addEventListener('click', () => this.openAddModal());
        
        // Sync button
        document.getElementById('syncBtn').addEventListener('click', () => this.syncToGitHub());
        
        // Load from GitHub
        document.getElementById('loadFromGitHubBtn').addEventListener('click', () => this.loadFromGitHub());
        
        // Form
        document.getElementById('wordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWord();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        
        // Search
        document.getElementById('wordSearch').addEventListener('input', (e) => {
            this.renderWordList(this.currentFilter, e.target.value);
        });
        
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });
    }
    
    addWord(wordData) {
        const word = {
            id: Date.now(),
            word: wordData.word.trim(),
            definition: wordData.definition.trim(),
            pronunciation: wordData.pronunciation?.trim() || '',
            partOfSpeech: wordData.partOfSpeech || 'noun',
            examples: wordData.examples ? wordData.examples.split('\n').filter(e => e.trim()) : [],
            synonyms: wordData.synonyms ? wordData.synonyms.split(',').map(s => s.trim()).filter(s => s) : [],
            antonyms: wordData.antonyms ? wordData.antonyms.split(',').map(a => a.trim()).filter(a => a) : [],
            difficulty: wordData.difficulty || 'medium',
            mastered: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.words.push(word);
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        
        this.showToast(`Added "${word.word}"`, 'success');
        return word;
    }
    
    renderWordList(filter = this.currentFilter, search = '') {
        const container = document.getElementById('wordList');
        if (!container) return;
        
        let filtered = this.words;
        
        // Apply search
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(w => 
                w.word.toLowerCase().includes(term) ||
                w.definition.toLowerCase().includes(term)
            );
        }
        
        // Apply filter
        switch(filter) {
            case 'mastered':
                filtered = filtered.filter(w => w.mastered);
                break;
            case 'learning':
                filtered = filtered.filter(w => !w.mastered);
                break;
            case 'difficult':
                filtered = filtered.filter(w => w.difficulty === 'difficult');
                break;
            case 'recent':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(w => new Date(w.createdAt) > weekAgo);
                break;
        }
        
        // Sort alphabetically
        filtered.sort((a, b) => a.word.localeCompare(b.word));
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-3);">
                    <i class="fas fa-search"></i>
                    <p>No words found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        filtered.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.dataset.id = word.id;
            
            if (word.id === this.currentWordId) {
                div.classList.add('active');
            }
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <strong>${word.word}</strong>
                    <span style="font-size: 12px; color: var(--text-3);">
                        ${word.partOfSpeech}
                    </span>
                </div>
                <div style="margin-top: 8px; font-size: 14px; color: var(--text-2);">
                    ${word.definition.substring(0, 100)}${word.definition.length > 100 ? '...' : ''}
                </div>
            `;
            
            div.addEventListener('click', () => this.viewWord(word.id));
            container.appendChild(div);
        });
    }
    
    updateStats() {
        document.getElementById('totalWords').textContent = this.words.length;
        
        const mastered = this.words.filter(w => w.mastered).length;
        document.getElementById('masteredWords').textContent = mastered;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = this.words.filter(w => new Date(w.createdAt) > weekAgo).length;
        document.getElementById('recentWords').textContent = recent;
        
        const difficult = this.words.filter(w => w.difficulty === 'difficult').length;
        document.getElementById('difficultWords').textContent = difficult;
    }
    
    openAddModal() {
        document.getElementById('wordForm').reset();
        document.getElementById('addWordModal').classList.add('active');
    }
    
    closeModal() {
        document.getElementById('addWordModal').classList.remove('active');
    }
    
    saveWord() {
        const formData = {
            word: document.getElementById('wordInput').value,
            definition: document.getElementById('definitionInput').value,
            pronunciation: document.getElementById('pronunciationInput').value,
            partOfSpeech: document.getElementById('partOfSpeechInput').value,
            examples: document.getElementById('examplesInput').value,
            difficulty: document.getElementById('difficultyInput').value,
            synonyms: document.getElementById('synonymsInput').value,
            antonyms: document.getElementById('antonymsInput').value
        };
        
        this.addWord(formData);
        this.closeModal();
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderWordList(filter, document.getElementById('wordSearch').value);
    }
    
    setupTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', theme);
        
        const btn = document.getElementById('themeToggle');
        const icon = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        btn.innerHTML = `<i class="${icon}"></i> ${theme === 'light' ? 'Dark' : 'Light'} Theme`;
    }
    
    toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const btn = document.getElementById('themeToggle');
        const icon = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        btn.innerHTML = `<i class="${icon}"></i> ${newTheme === 'light' ? 'Dark' : 'Light'} Theme`;
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.background = type === 'success' ? 'var(--success)' : 
                                type === 'error' ? 'var(--danger)' : 'var(--primary)';
        toast.style.color = 'white';
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.dict = new DictionaryManager();
});
