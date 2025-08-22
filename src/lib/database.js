import { supabase } from './supabase'

export const dbService = {
  // Employee operations
  async getEmployees(filters = {}) {
    let query = supabase.from('employee_details').select('*')
    
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    
    if (filters.role) {
      query = query.eq('role', filters.role)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async updateEmployee(id, updates) {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async createEmployee(employeeData) {
    // This will use Supabase Auth signup
    const { data, error } = await supabase.auth.signUp({
      email: employeeData.email,
      password: employeeData.password,
      options: {
        data: {
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          role: employeeData.role,
          department: employeeData.department,
          employee_id: employeeData.employee_id
        }
      }
    })
    return { data, error }
  },

  // Activity logs
  async getActivityLogs(limit = 50) {
    const { data, error } = await supabase
      .from('activity_logs_with_employee')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async logActivity(action, details = null) {
    const { error } = await supabase.rpc('log_activity', {
      action_name: action,
      details_json: details
    })
    return { error }
  }
}