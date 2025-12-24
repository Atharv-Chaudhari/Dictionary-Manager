class DictionaryManager {
    constructor() {
        this.words = [];
        this.currentWordId = null;
        this.currentFilter = 'all';
        this.isSyncing = false;
        this.githubConfig = {
            owner: 'Atharv-Chaudhari',
            repo: 'Dictionary-Manager',
            branch: 'main',
            token: null, // Will use GITHUB_TOKEN from workflow
            apiUrl: 'https://api.github.com'
        };
        
        this.init();
    }
    
    async init() {
        this.loadWords();
        this.setupEventListeners();
        this.updateStats();
        this.renderWordList();
        this.setupTheme();
        
        // Try to load words from GitHub on startup
        await this.loadFromGitHub();
    }
    
    async loadFromGitHub() {
        try {
            this.showToast('Loading dictionary from GitHub...', 'info');
            
            // Fetch from your GitHub repository's dictionary.json
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/main/dictionary.json`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.words && Array.isArray(data.words)) {
                    // Merge with local words, preferring GitHub version
                    const githubWords = data.words;
                    const localWordIds = new Set(this.words.map(w => w.word.toLowerCase()));
                    
                    // Add words from GitHub that don't exist locally
                    githubWords.forEach(githubWord => {
                        if (!localWordIds.has(githubWord.word.toLowerCase())) {
                            this.words.push({
                                ...githubWord,
                                id: Date.now() + Math.random() // Ensure unique ID
                            });
                        }
                    });
                    
                    this.saveWords();
                    this.updateStats();
                    this.renderWordList();
                    
                    this.showToast(`Loaded ${githubWords.length} words from GitHub`, 'success');
                }
            }
        } catch (error) {
            console.log('Could not load from GitHub, using local storage:', error);
            // Continue with local storage
        }
    }
    
    loadWords() {
        try {
            const saved = localStorage.getItem('dictionary_words');
            this.words = saved ? JSON.parse(saved) : [];
            
            // Add sample data if empty
            if (this.words.length === 0) {
                this.addSampleData();
            }
        } catch (err) {
            console.error('Failed to load words:', err);
            this.words = [];
        }
    }
    
    saveWords() {
        localStorage.setItem('dictionary_words', JSON.stringify(this.words));
        
        // Auto-sync to GitHub
        if (!this.isSyncing) {
            this.syncToGitHub();
        }
    }
    
    addSampleData() {
        const sampleWords = [
            {
                id: 1,
                word: 'Serendipity',
                definition: 'The occurrence and development of events by chance in a happy or beneficial way.',
                pronunciation: '/ˌsɛrənˈdɪpɪti/',
                partOfSpeech: 'noun',
                examples: [
                    'Finding that old photo was pure serendipity.',
                    'Their meeting was a happy serendipity.',
                    'The discovery was a moment of serendipity.'
                ],
                synonyms: ['fortunate discovery', 'happy accident', 'luck', 'fluke'],
                antonyms: ['misfortune', 'bad luck', 'calamity'],
                notes: 'I encountered this word while reading a novel. It describes those happy coincidences we sometimes experience.',
                difficulty: 'medium',
                mastered: false,
                source: 'Novel reading',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                githubId: null
            }
        ];
        
        this.words = sampleWords;
        localStorage.setItem('dictionary_words', JSON.stringify(this.words));
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Add word buttons
        document.getElementById('addWordBtn').addEventListener('click', () => this.openAddWordModal());
        document.getElementById('addFirstWordBtn').addEventListener('click', () => this.openAddWordModal());
        
        // Form submission
        document.getElementById('wordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWord();
        });
        
        // Cancel button
        document.getElementById('cancelWordBtn').addEventListener('click', () => this.closeModal());
        
        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        // Word actions
        document.getElementById('editWordBtn').addEventListener('click', () => this.editCurrentWord());
        document.getElementById('toggleMasteredBtn').addEventListener('click', () => this.toggleMastered());
        document.getElementById('deleteWordBtn').addEventListener('click', () => this.deleteCurrentWord());
        
        // GitHub sync
        document.getElementById('syncGitHubBtn').addEventListener('click', () => this.forceSyncToGitHub());
        
        // Search and filter
        document.getElementById('wordSearch').addEventListener('input', (e) => {
            this.renderWordList(this.currentFilter, e.target.value);
        });
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // Auto-sync every 5 minutes
        setInterval(() => {
            this.syncToGitHub();
        }, 5 * 60 * 1000);
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
            notes: wordData.notes?.trim() || '',
            difficulty: wordData.difficulty || 'medium',
            mastered: false,
            source: wordData.source?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            githubId: null
        };
        
        this.words.push(word);
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        this.viewWord(word.id);
        
        this.showToast(`"${word.word}" added successfully!`, 'success');
        
        return word;
    }
    
    async syncToGitHub() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        
        try {
            // Create a dictionary.json file
            const dictionaryData = {
                words: this.words,
                lastSync: new Date().toISOString(),
                totalWords: this.words.length,
                version: '1.0'
            };
            
            // Convert to Base64 for GitHub API
            const content = JSON.stringify(dictionaryData, null, 2);
            const contentBase64 = btoa(unescape(encodeURIComponent(content)));
            
            // Use GitHub Pages API to create/update file
            await this.updateGitHubFile(contentBase64);
            
            this.showToast('Auto-synced to GitHub', 'success');
        } catch (error) {
            console.error('GitHub sync failed:', error);
            // Don't show error toast for auto-sync to avoid annoyance
        } finally {
            this.isSyncing = false;
        }
    }
    
    async forceSyncToGitHub() {
        this.showToast('Syncing to GitHub...', 'info');
        
        try {
            const dictionaryData = {
                words: this.words,
                lastSync: new Date().toISOString(),
                totalWords: this.words.length,
                version: '1.0'
            };
            
            const content = JSON.stringify(dictionaryData, null, 2);
            const contentBase64 = btoa(unescape(encodeURIComponent(content)));
            
            await this.updateGitHubFile(contentBase64);
            
            this.showToast('Successfully synced to GitHub!', 'success');
        } catch (error) {
            console.error('Force sync failed:', error);
            this.showToast('Failed to sync: ' + error.message, 'error');
        }
    }
    
    async updateGitHubFile(contentBase64) {
        // This uses a serverless function approach
        // We'll use GitHub's API via a proxy to avoid CORS issues
        
        try {
            // Method 1: Direct fetch with CORS proxy
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const apiUrl = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/dictionary.json`;
            
            // First, check if file exists
            const checkResponse = await fetch(proxyUrl + apiUrl);
            let sha = null;
            
            if (checkResponse.ok) {
                const existingFile = await checkResponse.json();
                sha = existingFile.sha;
            }
            
            // Update or create file
            const updateResponse = await fetch(proxyUrl + apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${this.getGitHubToken()}`
                },
                body: JSON.stringify({
                    message: `📚 Update dictionary: ${this.words.length} words`,
                    content: contentBase64,
                    sha: sha,
                    branch: this.githubConfig.branch
                })
            });
            
            if (!updateResponse.ok) {
                throw new Error(`GitHub API error: ${updateResponse.status}`);
            }
            
            return await updateResponse.json();
        } catch (error) {
            console.error('GitHub update failed:', error);
            
            // Fallback: Use GitHub Issues API (which allows CORS)
            await this.createDictionaryIssue();
        }
    }
    
    async createDictionaryIssue() {
        try {
            const dictionaryData = {
                words: this.words,
                lastSync: new Date().toISOString(),
                totalWords: this.words.length,
                version: '1.0'
            };
            
            const issueData = {
                title: `[DICT-SYNC] Dictionary Update - ${new Date().toLocaleDateString()}`,
                body: '```json\n' + JSON.stringify(dictionaryData, null, 2) + '\n```',
                labels: ['dictionary-sync', 'auto-update']
            };
            
            // Use GitHub's issues API with CORS proxy
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const apiUrl = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/issues`;
            
            const response = await fetch(proxyUrl + apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${this.getGitHubToken()}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(issueData)
            });
            
            if (response.ok) {
                const issue = await response.json();
                console.log('Dictionary sync issue created:', issue.number);
            }
        } catch (error) {
            console.error('Failed to create issue:', error);
            throw error;
        }
    }
    
    getGitHubToken() {
        // In production, this would be stored securely
        // For demo, we'll use a placeholder
        return 'YOUR_GITHUB_TOKEN_HERE'; // Replace with actual token
    }
    
    updateWord(wordId, updates) {
        const index = this.words.findIndex(w => w.id === wordId);
        if (index === -1) return;
        
        this.words[index] = {
            ...this.words[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        this.viewWord(wordId);
        
        this.showToast(`"${this.words[index].word}" updated successfully!`, 'success');
    }
    
    deleteWord(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;
        
        if (!confirm(`Are you sure you want to delete "${word.word}"?`)) return;
        
        this.words = this.words.filter(w => w.id !== wordId);
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        
        // Hide word details
        document.getElementById('wordDetails').style.display = 'none';
        document.querySelector('.empty-state').style.display = 'block';
        
        this.showToast(`"${word.word}" deleted successfully`, 'success');
    }
    
    toggleMastered() {
        if (!this.currentWordId) return;
        
        const word = this.words.find(w => w.id === this.currentWordId);
        if (!word) return;
        
        const newMastered = !word.mastered;
        this.updateWord(this.currentWordId, { 
            mastered: newMastered,
            masteredAt: newMastered ? new Date().toISOString() : null
        });
        
        this.showToast(
            newMastered ? `"${word.word}" marked as mastered!` : `"${word.word}" unmarked from mastered`,
            'success'
        );
    }
    
    viewWord(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;
        
        this.currentWordId = wordId;
        
        // Update word list selection
        document.querySelectorAll('.word-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.wordId) === wordId) {
                item.classList.add('active');
            }
        });
        
        // Show word details
        document.querySelector('.empty-state').style.display = 'none';
        document.getElementById('wordDetails').style.display = 'block';
        
        // Update word details
        document.getElementById('wordTitle').textContent = word.word;
        document.getElementById('metaPartOfSpeech').textContent = this.capitalize(word.partOfSpeech);
        document.getElementById('metaPronunciation').textContent = word.pronunciation || '-';
        document.getElementById('metaAddedDate').textContent = new Date(word.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('metaDifficulty').textContent = this.capitalize(word.difficulty);
        document.getElementById('wordDefinition').textContent = word.definition;
        
        // Update examples
        const examplesContainer = document.getElementById('wordExamples');
        if (word.examples && word.examples.length > 0) {
            examplesContainer.innerHTML = word.examples.map(example => 
                `<div class="example-item">${this.escapeHtml(example)}</div>`
            ).join('');
        } else {
            examplesContainer.innerHTML = '<div class="example-item">No examples provided</div>';
        }
        
        // Update notes
        document.getElementById('wordNotes').textContent = word.notes || 'No personal notes';
        
        // Update synonyms
        const synonymsContainer = document.getElementById('wordSynonyms');
        if (word.synonyms && word.synonyms.length > 0) {
            synonymsContainer.innerHTML = word.synonyms.map(syn => 
                `<span class="synonym-tag">${this.escapeHtml(syn)}</span>`
            ).join('');
        } else {
            synonymsContainer.innerHTML = '<span class="synonym-tag">No synonyms</span>';
        }
        
        // Update antonyms
        const antonymsContainer = document.getElementById('wordAntonyms');
        if (word.antonyms && word.antonyms.length > 0) {
            antonymsContainer.innerHTML = word.antonyms.map(ant => 
                `<span class="antonym-tag">${this.escapeHtml(ant)}</span>`
            ).join('');
        } else {
            antonymsContainer.innerHTML = '<span class="antonym-tag">No antonyms</span>';
        }
        
        // Update mastered button
        const masteredBtn = document.getElementById('toggleMasteredBtn');
        const icon = word.mastered ? 'fas fa-times' : 'fas fa-check';
        const text = word.mastered ? 'Unmark Mastered' : 'Mark as Mastered';
        masteredBtn.innerHTML = `<i class="${icon}"></i> ${text}`;
        masteredBtn.className = word.mastered ? 'btn btn-warning' : 'btn btn-success';
    }
    
    renderWordList(filter = this.currentFilter, search = '') {
        const container = document.getElementById('wordList');
        if (!container) return;
        
        let filteredWords = [...this.words];
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredWords = filteredWords.filter(word => 
                word.word.toLowerCase().includes(searchLower) ||
                word.definition.toLowerCase().includes(searchLower) ||
                (word.notes && word.notes.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply category filter
        switch(filter) {
            case 'mastered':
                filteredWords = filteredWords.filter(w => w.mastered);
                break;
            case 'learning':
                filteredWords = filteredWords.filter(w => !w.mastered);
                break;
            case 'difficult':
                filteredWords = filteredWords.filter(w => w.difficulty === 'difficult');
                break;
            case 'recent':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filteredWords = filteredWords.filter(w => new Date(w.createdAt) > weekAgo);
                break;
        }
        
        // Sort alphabetically
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
        
        if (filteredWords.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-3);">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>${search ? 'No words found matching your search' : 'No words in this category'}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        filteredWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'word-item';
            item.dataset.wordId = word.id;
            
            if (word.id === this.currentWordId) {
                item.classList.add('active');
            }
            
            const masteredBadge = word.mastered ? 
                '<span class="badge badge-mastered" style="font-size: 10px; padding: 2px 8px;">Mastered</span>' : '';
            
            const difficultyBadge = `<span class="badge badge-difficulty" style="font-size: 10px; padding: 2px 8px;">${word.difficulty}</span>`;
            
            item.innerHTML = `
                <div class="word-item-header">
                    <div class="word-item-title">${this.escapeHtml(word.word)}</div>
                    <div style="display: flex; gap: 4px;">
                        ${masteredBadge}
                        ${difficultyBadge}
                    </div>
                </div>
                <div class="word-meta">
                    <span class="word-pos">${this.capitalize(word.partOfSpeech)}</span>
                </div>
                <div class="word-preview">
                    ${this.escapeHtml(word.definition.substring(0, 100))}${word.definition.length > 100 ? '...' : ''}
                </div>
            `;
            
            item.addEventListener('click', () => this.viewWord(word.id));
            container.appendChild(item);
        });
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderWordList(filter, document.getElementById('wordSearch').value);
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
    
    openAddWordModal() {
        document.getElementById('wordForm').reset();
        document.getElementById('wordInput').focus();
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
            antonyms: document.getElementById('antonymsInput').value,
            notes: document.getElementById('notesInput').value,
            source: document.getElementById('sourceInput').value
        };
        
        this.addWord(formData);
        this.closeModal();
    }
    
    editCurrentWord() {
        if (!this.currentWordId) return;
        
        const word = this.words.find(w => w.id === this.currentWordId);
        if (!word) return;
        
        // Populate form with current word data
        document.getElementById('wordInput').value = word.word;
        document.getElementById('definitionInput').value = word.definition;
        document.getElementById('pronunciationInput').value = word.pronunciation;
        document.getElementById('partOfSpeechInput').value = word.partOfSpeech;
        document.getElementById('examplesInput').value = word.examples.join('\n');
        document.getElementById('difficultyInput').value = word.difficulty;
        document.getElementById('synonymsInput').value = word.synonyms.join(', ');
        document.getElementById('antonymsInput').value = word.antonyms.join(', ');
        document.getElementById('notesInput').value = word.notes;
        document.getElementById('sourceInput').value = word.source;
        
        // Open modal
        document.getElementById('addWordModal').classList.add('active');
        
        // Update form to edit mode
        const form = document.getElementById('wordForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Word';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Word';
        
        form.onsubmit = (e) => {
            e.preventDefault();
            this.updateCurrentWord();
        };
    }
    
    updateCurrentWord() {
        if (!this.currentWordId) return;
        
        const formData = {
            word: document.getElementById('wordInput').value,
            definition: document.getElementById('definitionInput').value,
            pronunciation: document.getElementById('pronunciationInput').value,
            partOfSpeech: document.getElementById('partOfSpeechInput').value,
            examples: document.getElementById('examplesInput').value,
            difficulty: document.getElementById('difficultyInput').value,
            synonyms: document.getElementById('synonymsInput').value,
            antonyms: document.getElementById('antonymsInput').value,
            notes: document.getElementById('notesInput').value,
            source: document.getElementById('sourceInput').value,
            updatedAt: new Date().toISOString()
        };
        
        this.updateWord(this.currentWordId, formData);
        this.closeModal();
        
        // Reset form handler
        const form = document.getElementById('wordForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Save Word';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Word';
        
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveWord();
        };
    }
    
    deleteCurrentWord() {
        if (!this.currentWordId) return;
        this.deleteWord(this.currentWordId);
    }
    
    setupTheme() {
        const savedTheme = localStorage.getItem('dictionary_theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        const icon = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        themeBtn.innerHTML = `<i class="${icon}"></i> ${savedTheme === 'light' ? 'Dark' : 'Light'} Theme`;
    }
    
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('dictionary_theme', newTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        const icon = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        themeBtn.innerHTML = `<i class="${icon}"></i> ${newTheme === 'light' ? 'Dark' : 'Light'} Theme`;
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type]}" style="color: var(--${type});"></i>
            <div>${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.dictionary = new DictionaryManager();
});
