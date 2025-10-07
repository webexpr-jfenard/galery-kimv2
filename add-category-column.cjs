#!/usr/bin/env node

// Script to add the category column to the galleries table in Supabase
// This uses the Supabase REST API to execute a SQL migration

const https = require('https');

const SUPABASE_URL = 'ugfkyfmthbwqoeauyqlz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjU0MzksImV4cCI6MjA2NTI0MTQzOX0.0hr_vXm8xjkGytwbY0mR6OPs_9SR6hmiv8ucNSaRJ0U';

// First, let's check if the column already exists
console.log('🔍 Checking if category column already exists...');

const checkOptions = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/galleries?select=category&limit=1',
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
};

const checkReq = https.request(checkOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ La colonne category existe déjà dans la table galleries !');
      console.log('📊 Aucune migration nécessaire.');
      process.exit(0);
    } else if (res.statusCode === 400 || res.statusCode === 404) {
      console.log('❌ La colonne category n\'existe pas encore.');
      console.log('');
      console.log('⚠️  IMPORTANT: Ce script ne peut pas créer la colonne car il nécessite des privilèges admin.');
      console.log('');
      console.log('📝 Veuillez suivre ces étapes manuellement:');
      console.log('');
      console.log('1. Connectez-vous à votre dashboard Supabase:');
      console.log('   https://supabase.com/dashboard/project/ugfkyfmthbwqoeauyqlz');
      console.log('');
      console.log('2. Allez dans "SQL Editor" dans le menu de gauche');
      console.log('');
      console.log('3. Cliquez sur "New Query" et collez ce SQL:');
      console.log('');
      console.log('   -- Add category column to galleries table');
      console.log('   ALTER TABLE galleries ADD COLUMN IF NOT EXISTS category TEXT;');
      console.log('');
      console.log('   -- Create index for better performance');
      console.log('   CREATE INDEX IF NOT EXISTS idx_galleries_category ON galleries(category);');
      console.log('');
      console.log('4. Cliquez sur "Run" pour exécuter la requête');
      console.log('');
      console.log('✨ Une fois fait, rechargez votre application pour utiliser les catégories !');
      process.exit(1);
    } else {
      console.error('❌ Erreur lors de la vérification:', res.statusCode);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

checkReq.on('error', (e) => {
  console.error('❌ Erreur de connexion:', e.message);
  process.exit(1);
});

checkReq.end();
