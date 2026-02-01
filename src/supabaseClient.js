import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://akoxjqajdetrdvfxdcjv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrb3hqcWFqZGV0cmR2ZnhkY2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDY4MTAsImV4cCI6MjA4NTUyMjgxMH0.rQVLBEMi76Kfiw3uTfCDWZSa-vxk3s0ALOkkybRMS1I'

export const supabase = createClient(supabaseUrl, supabaseKey)
