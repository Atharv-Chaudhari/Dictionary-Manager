// ===== DICTIONARY MANAGER =====
class DictionaryManager {
    constructor() {
        this.words = [];
        this.currentFilter = 'all';
        this.autoSync = true;
        this.syncInterval = null;
        this.isSyncing = false;
        
        // GitHub Configuration
        this.githubConfig = {
            owner: 'Atharv-Chaudhari',
            repo: 'Dictionary-Manager',
            branch: 'main',
            token: 'PROXY_GITHUB_TOKEN', // Will be replaced by GitHub Actions
            apiUrl: 'https://api.github.com'
        };
        
        // Initialize the app
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Dictionary Manager...');
        
        // Load words from localStorage
        this.loadWords();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup theme
        this.setupTheme();
        
        // Update UI
        this.updateStats();
        this.renderWordList();
        
        // Try to load from GitHub
        await this.loadFromGitHub();
        
        // Start auto-sync (every 2 minutes)
        this.startAutoSync();
        
        // Show welcome message
        this.showToast('🎉 Dictionary loaded! Auto-sync is active.', 'success');
    }
    
    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // AI Analysis
        document.getElementById('aiAnalyzeBtn').addEventListener('click', () => this.analyzeWord());
        document.getElementById('aiWordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeWord();
        });
        
        // Manual add buttons
        document.getElementById('manualAddBtn').addEventListener('click', () => this.showAddWordModal());
        document.getElementById('addFirstWord').addEventListener('click', () => this.showAddWordModal());
        document.getElementById('startAI').addEventListener('click', () => {
            document.getElementById('aiWordInput').focus();
        });
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportDictionary());
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderWordList(this.currentFilter, e.target.value);
        });
        
        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.remove('active');
            });
        });
        
        // Close modal on backdrop click
        document.getElementById('wordModal').addEventListener('click', (e) => {
            if (e.target.id === 'wordModal') {
                e.target.classList.remove('active');
            }
        });
    }
    
    // ===== WORD ANALYSIS WITH AI =====
    async analyzeWord() {
        const wordInput = document.getElementById('aiWordInput');
        const word = wordInput.value.trim();
        
        if (!word) {
            this.showToast('Please enter a word', 'error');
            return;
        }
        
        // Clear previous result
        const resultDiv = document.getElementById('aiResult');
        resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Analyzing with AI...</div>';
        resultDiv.classList.add('active');
        
        try {
            // Try Puter.js first
            let wordData = await this.analyzeWithPuter(word);
            
            // If Puter fails, use Dictionary API
            if (!wordData) {
                wordData = await this.analyzeWithDictionaryAPI(word);
            }
            
            if (wordData) {
                this.showAIResult(wordData);
            } else {
                throw new Error('Could not analyze word');
            }
            
        } catch (error) {
            console.error('AI analysis failed:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--danger);">
                    <i class="fas fa-exclamation-triangle"></i> AI analysis failed
                    <p style="margin-top: 10px; font-size: 14px;">${error.message}</p>
                    <button class="btn btn-primary" style="margin-top: 15px;" onclick="dictionary.showAddWordModal('${word}')">
                        <i class="fas fa-plus"></i> Add Manually
                    </button>
                </div>
            `;
        }
    }
    
    async analyzeWithPuter(word) {
        try {
            // Check if Puter.js is available
            if (typeof puter === 'undefined') {
                console.log('Puter.js not loaded');
                return null;
            }
            
            // Initialize Puter
            await puter.init();
            
            // Use Puter AI
            const response = await puter.ai.chat({
                messages: [{
                    role: 'system',
                    content: `You are a dictionary expert. Analyze the word "${word}" and provide JSON with:
                    {
                        "word": "${word}",
                        "definition": "clear definition",
                        "partOfSpeech": "noun/verb/adjective/adverb",
                        "pronunciation": "/phonetics/",
                        "examples": ["example 1", "example 2", "example 3"],
                        "synonyms": ["syn1", "syn2", "syn3"],
                        "antonyms": ["ant1", "ant2"],
                        "difficulty": "easy/medium/hard",
                        "notes": "interesting facts"
                    }`
                }],
                model: 'gpt-3.5-turbo'
            });
            
            const aiText = response.choices[0].message.content;
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const wordData = JSON.parse(jsonMatch[0]);
                wordData.source = 'AI Analysis';
                return wordData;
            }
            
            return null;
            
        } catch (error) {
            console.log('Puter.js analysis failed:', error);
            return null;
        }
    }
    
    async analyzeWithDictionaryAPI(word) {
        try {
            // Use Free Dictionary API as fallback
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (response.ok) {
                const data = await response.json();
                const firstResult = data[0];
                
                const wordData = {
                    word: word,
                    definition: firstResult.meanings[0]?.definitions[0]?.definition || 'No definition available',
                    partOfSpeech: firstResult.meanings[0]?.partOfSpeech || 'unknown',
                    pronunciation: firstResult.phonetic || '/.../',
                    examples: firstResult.meanings[0]?.definitions?.slice(0, 3).map(d => d.example).filter(Boolean) || [],
                    synonyms: firstResult.meanings[0]?.definitions[0]?.synonyms?.slice(0, 3) || [],
                    antonyms: [],
                    difficulty: 'medium',
                    notes: '',
                    source: 'Dictionary API'
                };
                
                return wordData;
            }
            
            return null;
            
        } catch (error) {
            console.log('Dictionary API failed:', error);
            return null;
        }
    }
    
    showAIResult(wordData) {
        const resultDiv = document.getElementById('aiResult');
        
        const html = `
            <div class="ai-word-header">
                <div>
                    <div class="ai-word-title">${wordData.word}</div>
                    <div class="ai-word-meta">
                        <span class="ai-tag">${wordData.partOfSpeech}</span>
                        <span class="ai-tag ${wordData.difficulty}">${wordData.difficulty}</span>
                    </div>
                </div>
                <button class="btn btn-sm" onclick="document.getElementById('aiResult').classList.remove('active')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="ai-definition">${wordData.definition}</div>
            
            ${wordData.pronunciation ? `<p><strong>Pronunciation:</strong> ${wordData.pronunciation}</p>` : ''}
            
            ${wordData.examples.length > 0 ? `
            <div class="ai-examples">
                <h4><i class="fas fa-comment"></i> Examples</h4>
                <ul>
                    ${wordData.examples.map(ex => `<li>${ex}</li>`).join('')}
                </ul>
            </div>` : ''}
            
            ${wordData.synonyms.length > 0 || wordData.antonyms.length > 0 ? `
            <div class="ai-tags">
                ${wordData.synonyms.map(syn => `<span class="ai-tag synonym">${syn}</span>`).join('')}
                ${wordData.antonyms.map(ant => `<span class="ai-tag antonym">${ant}</span>`).join('')}
            </div>` : ''}
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-success" id="saveAIWord">
                    <i class="fas fa-save"></i> Save & Auto-Sync
                </button>
                <button class="btn btn-outline" onclick="dictionary.showAddWordModal('${wordData.word}', ${JSON.stringify(wordData).replace(/'/g, "\\'")})">
                    <i class="fas fa-edit"></i> Edit First
                </button>
            </div>
        `;
        
        resultDiv.innerHTML = html;
        
        // Add save event listener
        document.getElementById('saveAIWord').addEventListener('click', () => {
            this.addWord(wordData);
            resultDiv.classList.remove('active');
            document.getElementById('aiWordInput').value = '';
            this.showToast(`"${wordData.word}" saved and auto-syncing to GitHub!`, 'success');
        });
    }
    
    // ===== WORD MANAGEMENT =====
    showAddWordModal(word = '', data = null) {
        const modal = document.getElementById('wordModal');
        const modalBody = document.getElementById('wordModalBody');
        
        modalBody.innerHTML = `
            <form id="wordForm" style="display: grid; gap: 24px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-font"></i> Word *
                            </label>
                            <input type="text" id="formWord" value="${word}" required 
                                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-book"></i> Definition *
                            </label>
                            <textarea id="formDefinition" rows="4" required 
                                      style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">${data?.definition || ''}</textarea>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-comment"></i> Examples (one per line)
                            </label>
                            <textarea id="formExamples" rows="3"
                                      style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">${data?.examples?.join('\n') || ''}</textarea>
                        </div>
                    </div>
                    
                    <div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-layer-group"></i> Part of Speech
                            </label>
                            <select id="formPartOfSpeech" 
                                    style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                                <option value="noun" ${(data?.partOfSpeech === 'noun' || !data) ? 'selected' : ''}>Noun</option>
                                <option value="verb" ${data?.partOfSpeech === 'verb' ? 'selected' : ''}>Verb</option>
                                <option value="adjective" ${data?.partOfSpeech === 'adjective' ? 'selected' : ''}>Adjective</option>
                                <option value="adverb" ${data?.partOfSpeech === 'adverb' ? 'selected' : ''}>Adverb</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-bolt"></i> Difficulty
                            </label>
                            <select id="formDifficulty" 
                                    style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                                <option value="easy" ${data?.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                                <option value="medium" ${(data?.difficulty === 'medium' || !data) ? 'selected' : ''}>Medium</option>
                                <option value="hard" ${data?.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-sync-alt"></i> Synonyms (comma separated)
                            </label>
                            <input type="text" id="formSynonyms" value="${data?.synonyms?.join(', ') || ''}"
                                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-random"></i> Antonyms (comma separated)
                            </label>
                            <input type="text" id="formAntonyms" value="${data?.antonyms?.join(', ') || ''}"
                                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-2);">
                                <i class="fas fa-volume-up"></i> Pronunciation
                            </label>
                            <input type="text" id="formPronunciation" value="${data?.pronunciation || ''}"
                                   style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-2); color: var(--text-1);">
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                    <button type="button" class="btn" style="flex: 1;" onclick="document.getElementById('wordModal').classList.remove('active')">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-save"></i> Save & Auto-Sync
                    </button>
                </div>
            </form>
        `;
        
        // Add form submit handler
        const form = document.getElementById('wordForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveWordFromForm();
        };
        
        // Show modal
        modal.classList.add('active');
        document.getElementById('formWord').focus();
    }
    
    saveWordFromForm() {
        const wordData = {
            word: document.getElementById('formWord').value.trim(),
            definition: document.getElementById('formDefinition').value.trim(),
            partOfSpeech: document.getElementById('formPartOfSpeech').value,
            difficulty: document.getElementById('formDifficulty').value,
            pronunciation: document.getElementById('formPronunciation').value.trim(),
            examples: document.getElementById('formExamples').value.split('\n').filter(e => e.trim()),
            synonyms: document.getElementById('formSynonyms').value.split(',').map(s => s.trim()).filter(s => s),
            antonyms: document.getElementById('formAntonyms').value.split(',').map(a => a.trim()).filter(a => a),
            source: 'Manual Entry'
        };
        
        this.addWord(wordData);
        document.getElementById('wordModal').classList.remove('active');
    }
    
    addWord(wordData) {
        const word = {
            id: Date.now(),
            word: wordData.word,
            definition: wordData.definition,
            partOfSpeech: wordData.partOfSpeech,
            pronunciation: wordData.pronunciation || '',
            examples: wordData.examples || [],
            synonyms: wordData.synonyms || [],
            antonyms: wordData.antonyms || [],
            difficulty: wordData.difficulty || 'medium',
            mastered: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: wordData.source || 'Manual'
        };
        
        this.words.push(word);
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        
        // Auto-sync to GitHub
        this.syncToGitHub();
        
        return word;
    }
    
    viewWord(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;
        
        const modal = document.getElementById('wordModal');
        const modalBody = document.getElementById('wordModalBody');
        
        modalBody.innerHTML = `
            <div class="word-detail">
                <div class="word-main">
                    <h1 class="word-title-large">${word.word}</h1>
                    
                    <div class="word-meta-grid">
                        <div class="meta-item">
                            <div class="meta-icon">
                                <i class="fas fa-layer-group"></i>
                            </div>
                            <div class="meta-content">
                                <h4>Part of Speech</h4>
                                <p>${word.partOfSpeech}</p>
                            </div>
                        </div>
                        
                        <div class="meta-item">
                            <div class="meta-icon">
                                <i class="fas fa-bolt"></i>
                            </div>
                            <div class="meta-content">
                                <h4>Difficulty</h4>
                                <p><span class="word-badge ${word.difficulty}">${word.difficulty}</span></p>
                            </div>
                        </div>
                        
                        <div class="meta-item">
                            <div class="meta-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="meta-content">
                                <h4>Status</h4>
                                <p><span class="word-badge ${word.mastered ? 'mastered' : ''}">${word.mastered ? 'Mastered' : 'Learning'}</span></p>
                            </div>
                        </div>
                        
                        <div class="meta-item">
                            <div class="meta-icon">
                                <i class="fas fa-calendar"></i>
                            </div>
                            <div class="meta-content">
                                <h4>Added</h4>
                                <p>${new Date(word.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="definition-box">
                        <h3>Definition</h3>
                        <div class="definition-content">${word.definition}</div>
                    </div>
                </div>
                
                <div class="word-sidebar">
                    ${word.pronunciation ? `
                    <div>
                        <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-2);">
                            <i class="fas fa-volume-up"></i> Pronunciation
                        </h3>
                        <p style="font-size: 18px; font-family: monospace;">${word.pronunciation}</p>
                    </div>
                    ` : ''}
                    
                    ${word.examples.length > 0 ? `
                    <div>
                        <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-2);">
                            <i class="fas fa-comment"></i> Examples
                        </h3>
                        <div class="examples-list">
                            ${word.examples.map(ex => `<div class="example-item">${ex}</div>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${word.synonyms.length > 0 || word.antonyms.length > 0 ? `
                    <div class="synonyms-antonyms">
                        ${word.synonyms.length > 0 ? `
                        <div>
                            <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-2);">
                                <i class="fas fa-sync-alt"></i> Synonyms
                            </h3>
                            <div class="tags-container">
                                ${word.synonyms.map(syn => `<span class="ai-tag synonym">${syn}</span>`).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${word.antonyms.length > 0 ? `
                        <div>
                            <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-2);">
                                <i class="fas fa-random"></i> Antonyms
                            </h3>
                            <div class="tags-container">
                                ${word.antonyms.map(ant => `<span class="ai-tag antonym">${ant}</span>`).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: auto;">
                        <div style="display: flex; gap: 12px;">
                            <button class="btn ${word.mastered ? 'btn-warning' : 'btn-success'}" onclick="dictionary.toggleMastered(${word.id})" style="flex: 1;">
                                <i class="fas fa-star"></i> ${word.mastered ? 'Unmark Mastered' : 'Mark as Mastered'}
                            </button>
                            <button class="btn btn-danger" onclick="dictionary.deleteWord(${word.id})" style="flex: 1;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    toggleMastered(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (word) {
            word.mastered = !word.mastered;
            word.updatedAt = new Date().toISOString();
            this.saveWords();
            this.updateStats();
            this.renderWordList();
            
            this.showToast(
                `"${word.word}" ${word.mastered ? 'marked as mastered!' : 'unmarked from mastered'}`,
                'success'
            );
            
            // Auto-sync after change
            this.syncToGitHub();
        }
    }
    
    deleteWord(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;
        
        if (confirm(`Delete "${word.word}" from your dictionary?`)) {
            this.words = this.words.filter(w => w.id !== wordId);
            this.saveWords();
            this.updateStats();
            this.renderWordList();
            
            // Close modal if open
            document.getElementById('wordModal').classList.remove('active');
            
            this.showToast(`"${word.word}" deleted`, 'success');
            
            // Auto-sync after delete
            this.syncToGitHub();
        }
    }
    
    // ===== DATA PERSISTENCE =====
    loadWords() {
        try {
            const saved = localStorage.getItem('dictionary_words');
            this.words = saved ? JSON.parse(saved) : [];
            
            // Add sample data if empty
            if (this.words.length === 0) {
                this.words = [{
                    id: 1,
                    word: 'Serendipity',
                    definition: 'The occurrence and development of events by chance in a happy or beneficial way.',
                    partOfSpeech: 'noun',
                    pronunciation: '/ˌsɛrənˈdɪpɪti/',
                    examples: [
                        'Finding that old photo was pure serendipity.',
                        'Their meeting was a happy serendipity.'
                    ],
                    synonyms: ['fortunate discovery', 'happy accident', 'luck'],
                    antonyms: ['misfortune', 'bad luck'],
                    difficulty: 'medium',
                    mastered: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: 'Sample'
                }];
                this.saveWords();
            }
            
            console.log(`📚 Loaded ${this.words.length} words from localStorage`);
            
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = [];
        }
    }
    
    saveWords() {
        try {
            localStorage.setItem('dictionary_words', JSON.stringify(this.words));
            console.log(`💾 Saved ${this.words.length} words to localStorage`);
        } catch (error) {
            console.error('Error saving words:', error);
        }
    }
    
    async loadFromGitHub() {
        try {
            console.log('🔄 Loading from GitHub...');
            
            // Try to load from GitHub
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/main/dictionary.json`,
                { cache: 'no-cache' }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.words && Array.isArray(data.words)) {
                    console.log(`📥 Loaded ${data.words.length} words from GitHub`);
                    
                    // Merge words (avoid duplicates)
                    const existingWords = new Set(this.words.map(w => w.word.toLowerCase()));
                    
                    data.words.forEach(githubWord => {
                        if (!existingWords.has(githubWord.word.toLowerCase())) {
                            this.words.push({
                                ...githubWord,
                                id: Date.now() + Math.random(),
                                source: githubWord.source || 'GitHub Sync'
                            });
                        }
                    });
                    
                    this.saveWords();
                    this.updateStats();
                    this.renderWordList();
                    
                    this.showToast(`Synced ${data.words.length} words from GitHub`, 'success');
                }
            }
            
        } catch (error) {
            console.log('⚠️ Could not load from GitHub:', error);
        }
    }
    
    // ===== AUTO-SYNC TO GITHUB =====
    startAutoSync() {
        // Auto-sync every 2 minutes
        this.syncInterval = setInterval(() => {
            if (this.words.length > 0 && this.autoSync && !this.isSyncing) {
                this.syncToGitHub();
            }
        }, 2 * 60 * 1000);
        
        // Also sync when page is about to close
        window.addEventListener('beforeunload', () => {
            if (this.words.length > 0 && this.autoSync) {
                this.triggerBackgroundSync();
            }
        });
        
        console.log('🔁 Auto-sync started (every 2 minutes)');
    }
    
    async syncToGitHub() {
        if (this.isSyncing || this.words.length === 0) return;
        
        this.isSyncing = true;
        const status = document.getElementById('syncStatus');
        
        if (status) {
            status.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
        }
        
        try {
            console.log('🔄 Syncing to GitHub...');
            
            // Prepare dictionary data
            const dictionaryData = {
                words: this.words,
                metadata: {
                    lastSync: new Date().toISOString(),
                    totalWords: this.words.length,
                    version: '2.0',
                    autoGenerated: true
                }
            };
            
            // Save to GitHub using GitHub REST API
            await this.saveToGitHub(dictionaryData);
            
            console.log('✅ GitHub sync complete');
            
            if (status) {
                status.innerHTML = '<i class="fas fa-check-circle"></i> Synced';
                setTimeout(() => {
                    status.innerHTML = '<i class="fas fa-circle"></i> Auto-Sync: ACTIVE';
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ GitHub sync failed:', error);
            
            if (status) {
                status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Sync Failed';
                setTimeout(() => {
                    status.innerHTML = '<i class="fas fa-circle"></i> Auto-Sync: ACTIVE';
                }, 3000);
            }
            
            this.showToast('Sync failed. Will retry in 2 minutes.', 'error');
            
        } finally {
            this.isSyncing = false;
        }
    }
    
    async saveToGitHub(data) {
        // GitHub REST API endpoint
        const url = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/dictionary.json`;
        
        // Convert data to Base64
        const content = JSON.stringify(data, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));
        
        try {
            // First, try to get the existing file to get its SHA
            let sha = null;
            const getResponse = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.ok) {
                const existing = await getResponse.json();
                sha = existing.sha;
            }
            
            // Create or update the file
            const updateResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `🤖 Auto-sync: ${data.words.length} words`,
                    content: contentBase64,
                    sha: sha,
                    branch: this.githubConfig.branch
                })
            });
            
            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                throw new Error(error.message || 'GitHub API error');
            }
            
            console.log('✅ Dictionary saved to GitHub');
            this.showToast('Dictionary auto-synced to GitHub!', 'success');
            
            return await updateResponse.json();
            
        } catch (error) {
            console.error('GitHub API error:', error);
            
            // Fallback: Create a GitHub issue with the data
            await this.createGitHubIssue(data);
            
            throw error;
        }
    }
    
    async createGitHubIssue(data) {
        // Fallback method: Create a GitHub issue with the data
        const issueData = {
            title: `[DICT-AUTO] ${new Date().toLocaleDateString()} - ${data.words.length} words`,
            body: '```json\n' + JSON.stringify(data, null, 2) + '\n```',
            labels: ['dictionary-auto', 'auto-sync']
        };
        
        const response = await fetch(
            `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/issues`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(issueData)
            }
        );
        
        if (response.ok) {
            console.log('✅ Created GitHub issue as fallback');
            return await response.json();
        } else {
            throw new Error('Failed to create GitHub issue');
        }
    }
    
    triggerBackgroundSync() {
        // Use Beacon API for background sync (works even when page closes)
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
    
    // ===== UI RENDERING =====
    renderWordList(search = '') {
        const grid = document.getElementById('wordsGrid');
        const emptyState = document.getElementById('emptyState');
        
        // Filter words
        let filteredWords = this.words.filter(word => {
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                if (!word.word.toLowerCase().includes(searchLower) && 
                    !word.definition.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            
            // Apply category filter
            switch(this.currentFilter) {
                case 'mastered':
                    return word.mastered;
                case 'learning':
                    return !word.mastered;
                case 'difficult':
                    return word.difficulty === 'hard';
                case 'recent':
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(word.createdAt) > weekAgo;
                default:
                    return true;
            }
        });
        
        // Sort alphabetically
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
        
        // Show/hide empty state
        if (filteredWords.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.add('active');
            return;
        }
        
        emptyState.classList.remove('active');
        
        // Render word cards
        grid.innerHTML = filteredWords.map(word => `
            <div class="word-card" onclick="dictionary.viewWord(${word.id})">
                <div class="word-header">
                    <h3 class="word-title">${word.word}</h3>
                    <span class="word-badge ${word.difficulty}">${word.difficulty}</span>
                </div>
                <p class="word-definition">${word.definition}</p>
                <div class="word-footer">
                    <div class="word-meta">
                        <span class="word-tag">${word.partOfSpeech}</span>
                        ${word.mastered ? '<span class="word-tag" style="background: rgba(59,130,246,0.1); color: var(--info);">Mastered</span>' : ''}
                    </div>
                    <div class="word-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); dictionary.toggleMastered(${word.id})" title="${word.mastered ? 'Unmark mastered' : 'Mark as mastered'}">
                            <i class="fas fa-star" style="${word.mastered ? 'color: var(--info);' : 'color: var(--text-3);'}"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); dictionary.deleteWord(${word.id})" title="Delete">
                            <i class="fas fa-trash" style="color: var(--danger);"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Re-render words
        this.renderWordList(document.getElementById('searchInput').value);
    }
    
    updateStats() {
        document.getElementById('totalWords').textContent = this.words.length;
        
        const mastered = this.words.filter(w => w.mastered).length;
        document.getElementById('masteredWords').textContent = mastered;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = this.words.filter(w => new Date(w.createdAt) > weekAgo).length;
        document.getElementById('recentWords').textContent = recent;
        
        const difficult = this.words.filter(w => w.difficulty === 'hard').length;
        document.getElementById('difficultWords').textContent = difficult;
    }
    
    exportDictionary() {
        const data = {
            words: this.words,
            metadata: {
                exportedAt: new Date().toISOString(),
                totalWords: this.words.length,
                version: '1.0'
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dictionary_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Dictionary exported successfully!', 'success');
    }
    
    // ===== THEME MANAGEMENT =====
    setupTheme() {
        const savedTheme = localStorage.getItem('dictionary_theme') || 'light';
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const icon = document.querySelector('#themeToggle i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }
    
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('dictionary_theme', isDark ? 'dark' : 'light');
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        this.showToast(`Switched to ${isDark ? 'dark' : 'light'} theme`, 'info');
    }
    
    // ===== UTILITIES =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <div>${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
}

// ===== INITIALIZE APP =====
// Make dictionary globally available
window.dictionary = new DictionaryManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.dictionary) {
        window.dictionary = new DictionaryManager();
    }
});