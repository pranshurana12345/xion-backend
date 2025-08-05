import supabase from './supabaseClient.js';
import bcrypt from 'bcryptjs';

export const supabaseHelpers = {
  // User functions
  getUserByUsername: async (username) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  },

  createUser: async (username, password, role = 'user') => {
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        { username, password: hashedPassword, role }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    
    return data;
  },

  updateUser: async (id, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    
    return data;
  },

  deleteUser: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }
    
    return true;
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    return data || [];
  },

  // Content functions
  createContentItem: async (item) => {
    const { data, error } = await supabase
      .from('content_items')
      .insert([item])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating content item:', error);
      return null;
    }
    
    return data;
  },

  getContentItems: async (status = null) => {
    let query = supabase
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching content items:', error);
      return [];
    }
    
    return data || [];
  },

  getContentItemById: async (id) => {
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching content item:', error);
      return null;
    }
    
    return data;
  },

  updateContentStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('content_items')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating content status:', error);
      return null;
    }
    
    return data;
  },

  updateContentThumbnail: async (id, file_url) => {
    const { data, error } = await supabase
      .from('content_items')
      .update({ file_url })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating content thumbnail:', error);
      return null;
    }
    
    return data;
  },

  deleteContentItem: async (id) => {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting content item:', error);
      return false;
    }
    
    return true;
  },

  // Chat Statistics functions
  getChatStatistics: async () => {
    const { data, error } = await supabase
      .from('chat_statistics')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching chat statistics:', error);
      return { total_chats: 0, total_content_ideas: 0, last_updated: new Date() };
    }
    
    return data || { total_chats: 0, total_content_ideas: 0, last_updated: new Date() };
  },

  incrementChatCount: async () => {
    const { data, error } = await supabase
      .from('chat_statistics')
      .update({ 
        total_chats: supabase.sql`total_chats + 1`,
        last_updated: new Date()
      })
      .eq('id', 1)
      .select()
      .single();
    
    if (error) {
      console.error('Error incrementing chat count:', error);
      return null;
    }
    
    return data;
  },

  incrementContentIdeasCount: async () => {
    const { data, error } = await supabase
      .from('chat_statistics')
      .update({ 
        total_content_ideas: supabase.sql`total_content_ideas + 1`,
        last_updated: new Date()
      })
      .eq('id', 1)
      .select()
      .single();
    
    if (error) {
      console.error('Error incrementing content ideas count:', error);
      return null;
    }
    
    return data;
  },

  // Statistics
  getStats: async () => {
    const { data, error } = await supabase
      .from('content_items')
      .select('status');
    
    if (error) {
      console.error('Error fetching stats:', error);
      return { total_items: 0, pending_items: 0, approved_items: 0, rejected_items: 0 };
    }
    
    const items = data || [];
    const stats = {
      total_items: items.length,
      pending_items: items.filter(item => item.status === 'pending').length,
      approved_items: items.filter(item => item.status === 'approved').length,
      rejected_items: items.filter(item => item.status === 'rejected').length
    };
    
    return stats;
  },

  // Initialize default admin user
  initializeAdminUser: async () => {
    const adminUser = await supabaseHelpers.getUserByUsername('xion');
    
    if (!adminUser) {
      const hashedPassword = bcrypt.hashSync('password', 10);
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          { username: 'xion', password: hashedPassword, role: 'admin' }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating admin user:', error);
      } else {
        console.log('Default admin user created: xion/password');
      }
    }
  }
}; 