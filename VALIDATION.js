/**
 * Quick validation script for sync implementation
 * Run this in the browser console to verify pending changes
 */

// 1. Check localStorage keys
console.log('=== localStorage Keys ===');
const keys = Object.keys(localStorage).filter(k => k.startsWith('pr:'));
console.log('Found keys:', keys);
// Expected: ['pr:groups', 'pr:members', 'pr:transactions', 'pr:splits', 'pr:pendingChanges', ...]

// 2. Check pending changes structure
console.log('\n=== Pending Changes ===');
const pendingChanges = JSON.parse(localStorage.getItem('pr:pendingChanges') || '[]');
console.log('Count:', pendingChanges.length);
console.log('Sample:', pendingChanges.slice(0, 2));
// Expected structure:
// {
//   id: UUID,
//   timestamp: number,
//   operation: 'create|update|delete',
//   collection: 'groups|members|transactions|splits',
//   data: {...},
//   batchId?: UUID,
//   status: 'pending|processing|completed|error',
//   retryCount: number
// }

// 3. Check entities have lastModified
console.log('\n=== Entity Fields ===');
const groups = JSON.parse(localStorage.getItem('pr:groups') || '[]');
if (groups.length > 0) {
  console.log('Group sample:', groups[0]);
  console.log('Has lastModified:', 'lastModified' in groups[0]);
}

// 4. Check batch atomicity
console.log('\n=== Batch Atomicity ===');
const batchIds = new Set(pendingChanges
  .filter(c => c.batchId)
  .map(c => c.batchId)
);
console.log('Unique batch IDs:', batchIds.size);
batchIds.forEach(batchId => {
  const batch = pendingChanges.filter(c => c.batchId === batchId);
  console.log(`  Batch ${batchId}:`, batch.map(c => c.collection).join(' + '));
  // Expected: 'transactions + splits' (atomically grouped)
});

// 5. Check sync service availability
console.log('\n=== Sync Service ===');
// Import and check: import { syncService } from './lib/sync'
console.log('Check: syncService.getStatus()');
// Expected: { isSyncing: false, pendingCount: X, lastSyncTime: null, hasErrors: false }

// 6. Manual sync test
console.log('\n=== Manual Sync Test ===');
console.log('To test sync:');
console.log('  import { syncService } from "./lib/sync"');
console.log('  await syncService.fullSync()');
console.log('  // Check results in console');
