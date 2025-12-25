// Auto-generated dictionary data
// Last sync: $(date)
const dictionaryData = $(cat dictionary.json);

// Make it globally available
if (typeof window !== 'undefined') {
  window.dictionaryData = dictionaryData;
  
  // Auto-update if dictionary manager exists
  if (window.dictionary && window.dictionary.loadData) {
    window.dictionary.loadData(dictionaryData);
  }
}

console.log('📚 Dictionary loaded:', dictionaryData.totalWords, 'words');
