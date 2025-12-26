import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con los de tu proyecto de Supabase
const supabaseUrl = 'https://sygbrepajsbeohhzgrsq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z2JyZXBhanNiZW9oaHpncnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTUzOTIsImV4cCI6MjA4MTk3MTM5Mn0.HA-i5TzaCvhXO93qhbUAlnDVrcyjP6EMmI7pjtzsAmo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);