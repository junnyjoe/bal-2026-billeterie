const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  // Use the real Supabase client when credentials are provided
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  // Fallback mock client for testing environments without Supabase credentials
  const mockChain = {
    select: () => mockChain,
    eq: () => mockChain,
    order: () => mockChain,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    insert: () => mockChain,
    update: () => mockChain,
    delete: () => mockChain,
  };
  supabase = {
    from: () => mockChain
  };
}


// The supabase client is defined above conditionally.

module.exports = supabase;
