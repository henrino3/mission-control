#!/usr/bin/env node
// Migration script to add model field to tasks

const Database = require('better-sqlite3');
const db = new Database('tasks.db');

try {
  // Check if model column exists
  const columns = db.prepare("PRAGMA table_info(tasks)").all();
  const hasModel = columns.some(col => col.name === 'model');
  
  if (!hasModel) {
    console.log('Adding model column to tasks table...');
    db.prepare("ALTER TABLE tasks ADD COLUMN model TEXT").run();
    console.log('✅ Model column added successfully');
  } else {
    console.log('Model column already exists');
  }
  
  db.close();
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err.message);
  db.close();
  process.exit(1);
}
