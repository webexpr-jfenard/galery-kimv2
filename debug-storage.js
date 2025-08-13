// Script de debug pour tester les permissions Supabase Storage
// À exécuter dans la console du navigateur

console.log('🔍 Testing Supabase Storage permissions...');

// Test 1: Vérifier la configuration
if (window.supabaseService && window.supabaseService.isReady()) {
  console.log('✅ Supabase service is ready');
  
  // Test 2: Essayer de lister les buckets
  window.supabaseService.client.storage.listBuckets()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Cannot list buckets:', error);
      } else {
        console.log('✅ Available buckets:', data.map(b => b.name));
      }
    });
    
  // Test 3: Essayer de lister les fichiers dans le bucket photos
  window.supabaseService.client.storage
    .from('photos')
    .list('', { limit: 10 })
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Cannot list files in photos bucket:', error);
      } else {
        console.log('✅ Files in photos bucket:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('First few files:', data.slice(0, 3).map(f => f.name));
        }
      }
    });
    
  // Test 4: Vérifier les policies
  console.log('🔍 Testing storage policies...');
  const testPath = 'test-delete-permissions.txt';
  const testContent = 'Test file for deletion permissions';
  
  // Upload a test file
  window.supabaseService.client.storage
    .from('photos')
    .upload(testPath, new Blob([testContent], { type: 'text/plain' }))
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Cannot upload test file:', error);
        return;
      }
      
      console.log('✅ Test file uploaded');
      
      // Try to delete it immediately
      window.supabaseService.client.storage
        .from('photos')
        .remove([testPath])
        .then(({ data: deleteData, error: deleteError }) => {
          if (deleteError) {
            console.error('❌ Cannot delete test file - PERMISSIONS ISSUE:', deleteError);
            console.log('🔧 You need to check your Storage policies in Supabase');
          } else {
            console.log('✅ Test file deleted successfully - permissions OK');
          }
        });
    });
    
} else {
  console.error('❌ Supabase service not ready');
}