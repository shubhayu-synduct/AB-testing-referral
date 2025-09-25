// Script to clear browser storage for Firebase authentication
// Run this in the browser console on localhost:3000 to clear cached tokens

// console.log('Clearing Firebase authentication cache...');

// Clear localStorage
localStorage.clear();
// console.log('✓ localStorage cleared');

// Clear sessionStorage
sessionStorage.clear();
// console.log('✓ sessionStorage cleared');

// Clear IndexedDB (Firebase uses this for token storage)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name && (db.name.includes('firebase') || db.name.includes('firebaseLocalStorage'))) {
        // console.log(`Deleting IndexedDB: ${db.name}`);
        indexedDB.deleteDatabase(db.name);
      }
    });
  }).catch(err => {
    // console.log('Could not clear IndexedDB:', err);
  });
}

// console.log('✓ Firebase cache cleared. Please refresh the page.');
// console.log('Instructions:');
// console.log('1. Copy and paste this entire script into your browser console');
// console.log('2. Press Enter to execute');
// console.log('3. Refresh the page (F5 or Ctrl+R)');
// console.log('4. Sign in again to get fresh Firebase tokens with the correct project ID');