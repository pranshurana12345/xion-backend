import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://zbbblimakeutjkdwxtcy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYmJsaW1ha2V1dGprZHd4dGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5OTI1NSwiZXhwIjoyMDY5Mzc1MjU1fQ.tRN93Sr2ZPemsUn4f6gWFuHE1UXlBPmq-z8DninVnBE';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 