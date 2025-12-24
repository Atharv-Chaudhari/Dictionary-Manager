// server.js - Run this on Vercel/Netlify/Heroku
const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const app = express();

app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Endpoint to sync dictionary
app.post('/api/sync-dictionary', async (req, res) => {
    try {
        const { dictionaryData, owner, repo } = req.body;
        
        // Update dictionary.json file
        await octokit.repos.createOrUpdateFileContents({
            owner: owner || 'Atharv-Chaudhari',
            repo: repo || 'Dictionary-Manager',
            path: 'dictionary.json',
            message: `📚 Dictionary sync: ${dictionaryData.words.length} words`,
            content: Buffer.from(JSON.stringify(dictionaryData, null, 2)).toString('base64'),
            branch: 'main'
        });
        
        res.json({ success: true, message: 'Dictionary synced successfully' });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get dictionary
app.get('/api/dictionary', async (req, res) => {
    try {
        const { owner = 'Atharv-Chaudhari', repo = 'Dictionary-Manager' } = req.query;
        
        const response = await octokit.repos.getContent({
            owner,
            repo,
            path: 'dictionary.json',
            ref: 'main'
        });
        
        const content = Buffer.from(response.data.content, 'base64').toString();
        res.json(JSON.parse(content));
    } catch (error) {
        res.status(404).json({ words: [] });
    }
});

// Endpoint to add single word
app.post('/api/add-word', async (req, res) => {
    try {
        const { word, owner = 'Atharv-Chaudhari', repo = 'Dictionary-Manager' } = req.body;
        
        // Create individual word file
        const filename = word.word.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.json';
        
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `dictionaries/${filename}`,
            message: `➕ Add word: ${word.word}`,
            content: Buffer.from(JSON.stringify(word, null, 2)).toString('base64'),
            branch: 'main'
        });
        
        res.json({ success: true, filename });
    } catch (error) {
        console.error('Add word error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Dictionary proxy server running on port ${PORT}`);
});
