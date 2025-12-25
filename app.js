// LexiAI - Smart Dictionary Manager
class LexiAI {
    constructor() {
        this.words = [];
        this.currentWord = null;
        this.currentFilter = 'all';
        this.isSyncing = false;
        this.puter = null;
        
        this.githubConfig = {
            owner: 'Atharv-Chaudhari',
            repo: 'Dictionary-Manager',
            branch: 'main',
            token: null
        };
        
        this.init();
    }
    
    async init() {
        // Initialize Puter.js
        await this.initPuter();
        
        // Load words
        this.loadWords();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup theme
        this.setupTheme();
        
        // Update UI
        this.updateStats();
        this.renderWordList();
        
        // Load from GitHub
        await this.loadFromGitHub();
        
        // Start auto-sync
        this.startAutoSync();
    }
    
    async initPuter() {
        try {
            // Initialize Puter.js SDK
            this.puter = window.puter;
            
            // Test Puter connection
            const user = await this.puter.auth.getUser();
            console.log('✅ Puter.js connected:', user);
            
            this.showToast('AI Assistant Ready! Ask me about any word.', 'success');
            
        } catch (error) {
            console.warn('⚠️ Puter.js not available, using fallback:', error);
            this.puter = null;
            this.showToast('AI features disabled. Using local dictionary.', 'warning');
        }
    }
    
    async analyzeWordWithAI(word) {
        if (!this.puter) {
            throw new Error('Puter.js not available');
        }
        
        try {
            this.showToast(`Analyzing "${word}" with AI...`, 'info');
            
            // Use Puter.js AI to analyze word
            const response = await this.puter.ai.chat({
                messages: [
                    {
                        role: 'system',
                        content: `You are a linguistics expert. Analyze the word "${word}" and provide:
                        1. Definition (clear, concise)
                        2. Part of speech
                        3. Pronunciation (IPA format)
                        4. 3 usage examples
                        5. 5 synonyms
                        6. 3 antonyms
                        7. Difficulty level (easy/medium/difficult)
                        8. Interesting facts about the word
                        
                        Format response as JSON:
                        {
                            "word": "${word}",
                            "definition": "",
                            "partOfSpeech": "",
                            "pronunciation": "",
                            "examples": [],
                            "synonyms": [],
                            "antonyms": [],
                            "difficulty": "",
                            "notes": ""
                        }`
                    }
                ],
                model: 'gpt-3.5-turbo'
            });
            
            // Parse AI response
            const aiText = response.choices[0].message.content;
            
            // Try to extract JSON from response
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const wordData = JSON.parse(jsonMatch[0]);
                
                // Show AI results
                this.showAIResults(wordData);
                
                // Auto-save option
                if (confirm(`Save "${word}" to dictionary?`)) {
                    this.addWord(wordData);
                    this.showToast(`"${word}" saved to dictionary!`, 'success');
                }
                
                return wordData;
            } else {
                throw new Error('Could not parse AI response');
            }
            
        } catch (error) {
            console.error('AI analysis failed:', error);
            this.showToast('AI analysis failed: ' + error.message, 'error');
            
            // Fallback to local dictionary or manual entry
            this.openAddWordModal(word);
        }
    }
    
    showAIResults(wordData) {
        const aiResult = document.getElementById('aiResult');
        
        const html = `
            <div class="definition-box" style="margin-bottom: 20px;">
                <h3><i class="fas fa-robot"></i> AI Analysis</h3>
                <div class="definition-content">
                    <strong>${wordData.word}</strong> (${wordData.partOfSpeech})
                    <div style="color: var(--text-tertiary); margin: 8px 0;">${wordData.pronunciation}</div>
                    <p style="margin-top: 12px;">${wordData.definition}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h4 style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
                        <i class="fas fa-sync-alt"></i> Synonyms
                    </h4>
                    <div class="tags-container">
                        ${wordData.synonyms.slice(0, 5).map(syn => 
                            `<span class="tag synonym">${syn}</span>`
                        ).join('')}
                    </div>
                </div>
                <div>
                    <h4 style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
                        <i class="fas fa-random"></i> Antonyms
                    </h4>
                    <div class="tags-container">
                        ${wordData.antonyms.slice(0, 3).map(ant => 
                            `<span class="tag antonym">${ant}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
                    <i class="fas fa-comment"></i> Examples
                </h4>
                <div class="examples-list">
                    ${wordData.examples.map(example => 
                        `<div class="example-item">${example}</div>`
                    ).join('')}
                </div>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button class="action-btn" id="manualEditBtn" style="flex: 1;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn primary" id="saveAIWordBtn" style="flex: 1;">
                    <i class="fas fa-save"></i> Save to Dictionary
                </button>
            </div>
        `;
        
        aiResult.innerHTML = html;
        aiResult.style.display = 'block';
        
        // Add event listeners for buttons
        document.getElementById('saveAIWordBtn').addEventListener('click', () => {
            this.addWord(wordData);
            this.showToast(`"${wordData.word}" saved to dictionary!`, 'success');
        });
        
        document.getElementById('manualEditBtn').addEventListener('click', () => {
            this.openAddWordModal(wordData.word, wordData);
        });
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // AI Lookup
        document.getElementById('aiLookupBtn').addEventListener('click', () => this.openAIAssistant());
        document.getElementById('startWithAI').addEventListener('click', () => this.openAIAssistant());
        
        // Add word
        document.getElementById('addWordBtn').addEventListener('click', () => this.openAddWordModal());
        
        // Sync with GitHub
        document.getElementById('syncGitHubBtn').addEventListener('click', () => this.syncWithGitHub());
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportDictionary());
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderWordList(this.currentFilter, e.target.value);
        });
        
        // Categories
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // Chatbot
        document.getElementById('chatbotToggle').addEventListener('click', () => {
            document.getElementById('chatbotWindow').classList.toggle('active');
        });
        
        document.getElementById('sendMessage').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // AI Assistant
        document.getElementById('aiAnalyzeBtn').addEventListener('click', async () => {
            const word = document.getElementById('aiWordInput').value.trim();
            if (word) {
                await this.analyzeWordWithAI(word);
            }
        });
        
        document.getElementById('closeAIAssistant').addEventListener('click', () => {
            document.getElementById('aiAssistant').classList.remove('active');
        });
        
        // Modals
        document.getElementById('cancelAddWord').addEventListener('click', () => {
            document.getElementById('addWordModal').classList.remove('active');
        });
        
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.remove('active');
            });
        });
        
        // Word form
        document.getElementById('wordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWord();
        });
        
        // AI Word Input
        document.getElementById('aiWordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('aiAnalyzeBtn').click();
            }
        });
    }
    
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        const messages = document.getElementById('chatMessages');
        
        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user';
        userMsg.textContent = message;
        messages.appendChild(userMsg);
        
        input.value = '';
        
        // Scroll to bottom
        messages.scrollTop = messages.scrollHeight;
        
        // Process message
        if (message.toLowerCase().includes('lookup') || message.toLowerCase().includes('define')) {
            // Extract word from message
            const words = message.split(' ');
            const wordIndex = words.findIndex(w => 
                w.toLowerCase() === 'lookup' || 
                w.toLowerCase() === 'define' ||
                w.toLowerCase() === 'what' ||
                w.toLowerCase() === 'meaning'
            );
            
            if (wordIndex !== -1 && words[wordIndex + 1]) {
                const word = words[wordIndex + 1].replace(/[^a-zA-Z]/g, '');
                await this.handleWordLookup(word, messages);
            } else {
                this.sendBotMessage("Please specify a word to lookup. Example: 'lookup serendipity'", messages);
            }
        } else if (message.toLowerCase().includes('save') || message.toLowerCase().includes('add')) {
            this.sendBotMessage("To add a word, click the 'AI Word Lookup' button or use the Add Word form.", messages);
        } else {
            this.sendBotMessage("I can help you lookup words, provide definitions, and save them to your dictionary. Try asking: 'lookup serendipity'", messages);
        }
    }
    
    async handleWordLookup(word, messages) {
        this.sendBotMessage(`Looking up "${word}"...`, messages);
        
        try {
            if (this.puter) {
                const wordData = await this.analyzeWordWithAI(word);
                
                // Format response for chat
                const response = `
📚 *${wordData.word}* (${wordData.partOfSpeech})
${wordData.pronunciation}

**Definition:** ${wordData.definition}

**Examples:**
${wordData.examples.map(ex => `• ${ex}`).join('\n')}

**Synonyms:** ${wordData.synonyms.slice(0, 3).join(', ')}

**Difficulty:** ${wordData.difficulty}

Would you like to save this word to your dictionary? Type 'save ${word}' to add it.
                `;
                
                this.sendBotMessage(response, messages);
            } else {
                this.sendBotMessage(`I couldn't analyze "${word}" with AI right now. Please try the manual lookup feature.`, messages);
            }
        } catch (error) {
            this.sendBotMessage(`Sorry, I couldn't analyze "${word}". Please try again or add it manually.`, messages);
        }
    }
    
    sendBotMessage(text, messages) {
        const msg = document.createElement('div');
        msg.className = 'message bot';
        msg.innerHTML = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }
    
    openAIAssistant() {
        document.getElementById('aiAssistant').classList.add('active');
        document.getElementById('aiWordInput').focus();
    }
    
    openAddWordModal(word = '', data = null) {
        const modal = document.getElementById('addWordModal');
        const form = document.getElementById('wordForm');
        
        if (data) {
            // Pre-fill with AI data
            document.getElementById('wordInput').value = data.word || word;
            document.getElementById('definitionInput').value = data.definition || '';
            document.getElementById('partOfSpeechInput').value = data.partOfSpeech || 'noun';
            document.getElementById('pronunciationInput').value = data.pronunciation || '';
            document.getElementById('difficultyInput').value = data.difficulty || 'medium';
            document.getElementById('examplesInput').value = (data.examples || []).join('\n');
            document.getElementById('synonymsInput').value = (data.synonyms || []).join(', ');
            document.getElementById('antonymsInput').value = (data.antonyms || []).join(', ');
        } else if (word) {
            // Just pre-fill the word
            document.getElementById('wordInput').value = word;
        } else {
            // Clear form
            form.reset();
        }
        
        modal.classList.add('active');
        document.getElementById('wordInput').focus();
    }
    
    addWord(wordData) {
        const word = {
            id: Date.now(),
            word: wordData.word.trim(),
            definition: wordData.definition.trim(),
            pronunciation: wordData.pronunciation?.trim() || '',
            partOfSpeech: wordData.partOfSpeech || 'noun',
            examples: Array.isArray(wordData.examples) ? wordData.examples : 
                     (wordData.examples ? wordData.examples.split('\n').filter(e => e.trim()) : []),
            synonyms: Array.isArray(wordData.synonyms) ? wordData.synonyms : 
                     (wordData.synonyms ? wordData.synonyms.split(',').map(s => s.trim()).filter(s => s) : []),
            antonyms: Array.isArray(wordData.antonyms) ? wordData.antonyms : 
                     (wordData.antonyms ? wordData.antonyms.split(',').map(a => a.trim()).filter(a => a) : []),
            difficulty: wordData.difficulty || 'medium',
            mastered: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: wordData.source || (this.puter ? 'AI Analysis' : 'Manual Entry')
        };
        
        this.words.push(word);
        this.saveWords();
        this.updateStats();
        this.renderWordList();
        
        // Close modals
        document.getElementById('addWordModal').classList.remove('active');
        document.getElementById('aiAssistant').classList.remove('active');
        
        // Show success
        this.showToast(`"${word.word}" added to dictionary!`, 'success');
        
        return word;
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
            source: 'Manual Entry'
        };
        
        this.addWord(formData);
    }
    
    // ... [Previous methods: loadWords, saveWords, renderWordList, updateStats, etc.]
    // Keep all the previous methods from the dictionary.js file
    
    async syncWithGitHub() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        const btn = document.getElementById('syncGitHubBtn');
        const status = document.getElementById('syncStatus');
        
        if (btn) btn.disabled = true;
        if (status) status.textContent = 'Syncing...';
        
        this.showToast('Syncing with GitHub...', 'info');
        
        try {
            // Prepare dictionary data
            const dictionaryData = {
                words: this.words,
                lastSync: new Date().toISOString(),
                totalWords: this.words.length,
                version: '2.0',
                syncedFrom: 'LexiAI App'
            };
            
            // Create GitHub issue with dictionary data
            await this.createGitHubIssue(dictionaryData);
            
            this.showToast('Dictionary synced to GitHub!', 'success');
            
        } catch (error) {
            console.error('GitHub sync failed:', error);
            this.showToast('Sync failed: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
            if (btn) btn.disabled = false;
            if (status) status.textContent = '';
        }
    }
    
    async createGitHubIssue(dictionaryData) {
        // This creates a GitHub issue with the dictionary data
        // GitHub Actions will process it and save to the repo
        
        const issueData = {
            title: `[LEXIAI-SYNC] ${new Date().toLocaleDateString()} - ${this.words.length} words`,
            body: '```json\n' + JSON.stringify(dictionaryData, null, 2) + '\n```',
            labels: ['lexiai-sync', 'dictionary', 'auto-sync']
        };
        
        // Create download link for the data
        this.downloadDictionary();
        
        // Also provide a direct link to create issue
        const issueUrl = `https://github.com/${this.githubConfig.owner}/${this.githubConfig.repo}/issues/new?` +
            `title=${encodeURIComponent(issueData.title)}&` +
            `body=${encodeURIComponent(issueData.body)}&` +
            `labels=lexiai-sync,dictionary`;
        
        // Open in new tab for manual creation
        window.open(issueUrl, '_blank');
        
        this.showToast('GitHub issue created! Dictionary saved.', 'success');
    }
    
    downloadDictionary() {
        const data = {
            words: this.words,
            lastSync: new Date().toISOString(),
            totalWords: this.words.length,
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexiai_dictionary_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ... [Previous utility methods]
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type]}" style="color: var(--${type});"></i>
            <div>${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.lexiai = new LexiAI();
});
