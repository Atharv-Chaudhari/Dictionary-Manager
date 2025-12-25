// Auto-generated dictionary data
// Last sync: $(date)
window.dictionaryData = $(cat dictionary.json);
console.log('📚 Dictionary loaded:', window.dictionaryData.words.length, 'words');
if (window.dictionary && window.dictionary.loadData) {
  window.dictionary.loadData(window.dictionaryData);
}
