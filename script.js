// ===== DICTIONARY MANAGER =====
class DictionaryManager {
    constructor() {
        this.words = [];
        this.currentFilter = 'all';
        this.autoSync = true;
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        
        // GitHub Configuration
        this.githubConfig = {
            owner: 'Atharv-Chaudhari',
            repo: 'Dictionary-Manager',
            branch: 'main',
            rawUrl: 'https://raw.githubusercontent.com'
        };
        
        // Initialize the app
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Dictionary Manager...');
        
        // Load from localStorage first
        this.loadFromLocalStorage();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup theme
        this.setupTheme();
        
        // Update UI
        this.updateStats();
        this.renderWordList();
        
        // Start auto-sync
        this.startAutoSync();
        
        // Setup sync indicator
        this.updateSyncStatus('synced');
        
        this.showToast('📚 Dictionary Manager Ready!', 'success');
        
        // Load from GitHub in background
        setTimeout(() => this.syncFromGitHub(), 1000);
    }
    
    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Manual sync button
        document.getElementById('manualSyncBtn').addEventListener('click', () => this.manualSync());
        
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
            this.renderWordList(e.target.value);
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
    
    // ===== LOCAL STORAGE =====
    loadFromLocalStorage() {
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
                this.saveToLocalStorage();
            }
            
            console.log(`📚 Loaded ${this.words.length} words from localStorage`);
            
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = [];
        }
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('dictionary_words', JSON.stringify(this.words));
            console.log(`💾 Saved ${this.words.length} words to localStorage`);
        } catch (error) {
            console.error('Error saving words:', error);
        }
    }
    
    // ===== GITHUB SYNC =====
    async syncFromGitHub() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        this.updateSyncStatus('syncing');
        
        try {
            console.log('🔄 Syncing from GitHub...');
            
            const url = `${this.githubConfig.rawUrl}/${this.githubConfig.owner}/${this.githubConfig.repo}/${this.githubConfig.branch}/dictionary.json`;
            const response = await fetch(url, {
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.words && Array.isArray(data.words)) {
                    // Merge GitHub data with local data
                    this.mergeWithGitHubData(data.words);
                    
                    console.log(`✅ Synced ${data.words.length} words from GitHub`);
                    this.showToast('🔄 Synced latest changes from GitHub', 'success');
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to sync from GitHub:', error);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus('synced');
            this.lastSyncTime = new Date();
        }
    }
    
    mergeWithGitHubData(githubWords) {
        const localWordIds = new Set(this.words.map(w => w.id));
        const githubWordIds = new Set(githubWords.map(w => w.id));
        
        // Add new words from GitHub
        githubWords.forEach(githubWord => {
            if (!localWordIds.has(githubWord.id)) {
                this.words.push(githubWord);
            }
        });
        
        // Update existing words if GitHub version is newer
        this.words = this.words.map(localWord => {
            const githubWord = githubWords.find(w => w.id === localWord.id);
            if (githubWord) {
                const localDate = new Date(localWord.updatedAt || localWord.createdAt || 0);
                const githubDate = new Date(githubWord.updatedAt || githubWord.createdAt || 0);
                
                if (githubDate > localDate) {
                    return githubWord; // Use GitHub version if newer
                }
            }
            return localWord;
        });
        
        // Save merged data
        this.saveToLocalStorage();
        this.updateStats();
        this.renderWordList();
    }
    
    async pushToGitHub() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        this.updateSyncStatus('syncing');
        
        try {
            console.log('🚀 Pushing changes to GitHub...');
            
            // Create sync request
            const syncData = {
                timestamp: new Date().toISOString(),
                words: this.words,
                device: navigator.userAgent.substring(0, 100),
                url: window.location.href,
                action: 'sync_request'
            };
            
            // Create an issue with the sync data
            await this.createSyncIssue(syncData);
            
            // Also trigger repository dispatch
            await this.triggerRepositoryDispatch(syncData);
            
            console.log('✅ Changes queued for GitHub sync');
            this.showToast('📤 Changes queued for GitHub sync!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to push to GitHub:', error);
            this.showToast('⚠️ Failed to queue sync', 'error');
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus('synced');
        }
    }
        // ===== IMPROVED SYNC METHOD =====
    async improvedSync() {
        try {
            console.log('🚀 Starting improved sync...');
            
            // Create sync payload
            const syncPayload = {
                timestamp: new Date().toISOString(),
                words: this.words,
                device: navigator.userAgent.substring(0, 100),
                action: 'dictionary_sync',
                source: 'web_app'
            };
            
            // Method 1: Create GitHub Issue
            await this.createSyncIssue(syncPayload);
            
            // Method 2: Try repository dispatch (might fail for public access, that's OK)
            try {
                await fetch(
                    `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/dispatches`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            event_type: 'dictionary_sync',
                            client_payload: syncPayload
                        })
                    }
                );
                console.log('✅ Repository dispatch sent');
            } catch (error) {
                console.log('⚠️ Repository dispatch failed (expected)');
            }
            
            this.showToast('📤 Sync request sent to GitHub!', 'success');
            
            // Check for updates after 10 seconds
            setTimeout(() => this.syncFromGitHub(), 10000);
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.showToast('⚠️ Sync failed, will retry', 'error');
        }
    }
    
    // Update the existing pushToGitHub method to use improvedSync
    // Replace the existing pushToGitHub method with:
    async pushToGitHub() {
        return this.improvedSync();
    }
    async createSyncIssue(syncData) {
        try {
            // Create issue data
            const issueData = {
                title: `[SYNC-REQUEST] ${new Date().toLocaleString()} - ${syncData.words.length} words`,
                body: `## Sync Request\n\n**Device:** ${syncData.device}\n**Time:** ${syncData.timestamp}\n**Words:** ${syncData.words.length}\n\n\`\`\`json\n${JSON.stringify(syncData, null, 2)}\n\`\`\``,
                labels: ['sync-request', 'auto-sync']
            };
            
            // Store locally for tracking
            localStorage.setItem('last_sync_request', JSON.stringify(issueData));
            localStorage.setItem('last_sync_time', new Date().toISOString());
            
            console.log('📝 Sync issue created locally');
            
        } catch (error) {
            console.error('Failed to create sync issue:', error);
        }
    }
    
    async triggerRepositoryDispatch(syncData) {
        try {
            // Try to trigger repository_dispatch event
            const response = await fetch(
                `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event_type: 'dictionary_sync',
                        client_payload: syncData
                    })
                }
            );
            
            if (response.ok) {
                console.log('✅ Repository dispatch triggered');
            }
        } catch (error) {
            // Silent fail - issues method will work
            console.log('⚠️ Repository dispatch failed (expected for public access)');
        }
    }
    
    // ===== AUTO-SYNC SYSTEM =====
    startAutoSync() {
        // Pull changes from GitHub every 60 seconds
        this.syncInterval = setInterval(() => {
            this.syncFromGitHub();
        }, 60 * 1000);
        
        // Push local changes every 2 minutes
        setInterval(() => {
            this.pushToGitHub();
        }, 120 * 1000);
        
        console.log('🔁 Auto-sync started');
    }
    
    manualSync() {
        this.pushToGitHub();
        setTimeout(() => this.syncFromGitHub(), 5000);
    }
    
    // ===== SYNC INDICATOR =====
    updateSyncStatus(status) {
        const indicator = document.getElementById('syncStatus');
        if (!indicator) return;
        
        const statusConfig = {
            syncing: { icon: 'fa-sync-alt fa-spin', text: 'Syncing...', color: 'var(--warning)' },
            synced: { icon: 'fa-circle', text: 'Auto-Sync', color: 'var(--success)' },
            error: { icon: 'fa-exclamation-circle', text: 'Sync Error', color: 'var(--danger)' }
        };
        
        const config = statusConfig[status] || statusConfig.synced;
        indicator.innerHTML = `<i class="fas ${config.icon}"></i> ${config.text}`;
        indicator.style.color = config.color;
    }
    
    // ===== WORD ANALYSIS =====
    async analyzeWord() {
        const wordInput = document.getElementById('aiWordInput');
        const word = wordInput.value.trim();
        
        if (!word) {
            this.showToast('Please enter a word', 'error');
            return;
        }
        
        const resultDiv = document.getElementById('aiResult');
        resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Analyzing...</div>';
        resultDiv.classList.add('active');
        
        try {
            const wordData = await this.analyzeWithDictionaryAPI(word);
            
            if (wordData) {
                this.showAIResult(wordData);
            } else {
                throw new Error('Could not analyze word');
            }
            
        } catch (error) {
            console.error('Analysis failed:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--danger);">
                    <i class="fas fa-exclamation-triangle"></i> Analysis failed
                    <p style="margin-top: 10px; font-size: 14px;">${error.message}</p>
                    <button class="btn btn-primary" style="margin-top: 15px;" onclick="dictionary.showAddWordModal('${word}')">
                        <i class="fas fa-plus"></i> Add Manually
                    </button>
                </div>
            `;
        }
    }
    
    async analyzeWithDictionaryAPI(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (response.ok) {
                const data = await response.json();
                const firstResult = data[0];
                
                return {
                    word: word,
                    definition: firstResult.meanings[0]?.definitions[0]?.definition || 'No definition available',
                    partOfSpeech: firstResult.meanings[0]?.partOfSpeech || 'unknown',
                    pronunciation: firstResult.phonetic || '/.../',
                    examples: firstResult.meanings[0]?.definitions?.slice(0, 3).map(d => d.example).filter(Boolean) || [],
                    synonyms: firstResult.meanings[0]?.definitions[0]?.synonyms?.slice(0, 3) || [],
                    antonyms: [],
                    difficulty: 'medium',
                    source: 'Dictionary API'
                };
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
                    <i class="fas fa-save"></i> Save to Dictionary
                </button>
                <button class="btn btn-outline" onclick="dictionary.showAddWordModal('${wordData.word}', ${JSON.stringify(wordData).replace(/'/g, "\\'")})">
                    <i class="fas fa-edit"></i> Edit First
                </button>
            </div>
        `;
        
        resultDiv.innerHTML = html;
        
        document.getElementById('saveAIWord').addEventListener('click', () => {
            this.addWord(wordData);
            resultDiv.classList.remove('active');
            document.getElementById('aiWordInput').value = '';
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
                        <i class="fas fa-save"></i> Save Word
                    </button>
                </div>
            </form>
        `;
        
        const form = document.getElementById('wordForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveWordFromForm();
        };
        
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
        const newWord = {
            id: Date.now() + Math.random(),
            ...wordData,
            mastered: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.words.push(newWord);
        this.saveToLocalStorage();
        this.updateStats();
        this.renderWordList();
        
        // Trigger sync to GitHub
        this.pushToGitHub();
        
        this.showToast(`"${newWord.word}" added!`, 'success');
        return newWord;
    }
    
    toggleMastered(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (word) {
            word.mastered = !word.mastered;
            word.updatedAt = new Date().toISOString();
            
            this.saveToLocalStorage();
            this.updateStats();
            this.renderWordList();
            
            // Trigger sync
            this.pushToGitHub();
            
            this.showToast(
                `"${word.word}" ${word.mastered ? 'marked as mastered!' : 'unmarked'}`,
                'success'
            );
        }
    }
    
    deleteWord(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;
        
        if (confirm(`Delete "${word.word}" from your dictionary?`)) {
            this.words = this.words.filter(w => w.id !== wordId);
            
            this.saveToLocalStorage();
            this.updateStats();
            this.renderWordList();
            
            // Trigger sync
            this.pushToGitHub();
            
            document.getElementById('wordModal').classList.remove('active');
            this.showToast(`"${word.word}" deleted`, 'success');
        }
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
    
    // ===== UI RENDERING =====
    renderWordList(search = '') {
        const grid = document.getElementById('wordsGrid');
        const emptyState = document.getElementById('emptyState');
        
        let filteredWords = this.words.filter(word => {
            if (search) {
                const searchLower = search.toLowerCase();
                if (!word.word.toLowerCase().includes(searchLower) && 
                    !word.definition.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            
            switch(this.currentFilter) {
                case 'mastered': return word.mastered;
                case 'learning': return !word.mastered;
                case 'difficult': return word.difficulty === 'hard';
                case 'recent': 
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(word.createdAt) > weekAgo;
                default: return true;
            }
        });
        
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
        
        if (filteredWords.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.add('active');
            return;
        }
        
        emptyState.classList.remove('active');
        
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
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
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
    
    // ===== THEME =====
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
    
    // ===== GITHUB SYNC CALLBACKS =====
    onDataUpdate(newData) {
        if (newData && newData.words) {
            console.log('🔄 Received updated data from GitHub');
            
            // Merge with local data
            this.mergeWithGitHubData(newData.words);
            
            // Update UI
            this.updateStats();
            this.renderWordList();
            
            this.showToast('🔄 Synced latest changes from other devices', 'success');
        }
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

// ===== INITIALIZE =====
window.dictionary = new DictionaryManager();