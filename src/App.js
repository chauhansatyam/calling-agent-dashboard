"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Phone,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  MessageSquare,
  Flame,
  Snowflake,
  ThermometerSun,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  Shield,
  Star,
  Menu,
  X,
  SkipForward,
  MessageCircle,
  MailIcon,
} from "lucide-react"
import { supabase } from "./lib/supabase"
import { authService } from "./lib/auth"

const CallingAgentDashboard = () => {
  // Authentication state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup when component unmounts
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    document.title = "Calling Agent Dashboard";
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Data state
  const [employees, setEmployees] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [leads, setLeads] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // Lead-specific filters
  const [leadSearchTerm, setLeadSearchTerm] = useState("")
  const [leadFilterStatus, setLeadFilterStatus] = useState("")
  const [leadFilterPriority, setLeadFilterPriority] = useState("")
  const [leadFilterTemperature, setLeadFilterTemperature] = useState("")
  const [showOnlyDue, setShowOnlyDue] = useState(false)
  const [skippedLeads, setSkippedLeads] = useState(new Set())

  const [showLeadDetails, setShowLeadDetails] = useState(false)

  // Form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "", company: "" })
  const [employeeForm, setEmployeeForm] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "agent",
    department: "",
    password: "",
  })
  const [leadUpdateForm, setLeadUpdateForm] = useState({
    status: "",
    call_status: "",
    user_remark: "",
    next_follow_up: "",
  })



  // Add this useEffect to listen for auth state changes
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);

        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in
          const { data: profile, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (profile && !error) {
            setCurrentUser(session.user);
            setUserProfile(profile);
            setIsAuthenticated(true);
            console.log("Auth listener - profile loaded:", profile);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setIsAuthenticated(false);
          setCurrentUser(null);
          setUserProfile(null);
          setLeads([]);
          setEmployees([]);
          setActivityLogs([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getAgentTableName = (employeeId) => {
    if (!employeeId) return null;
    return `leads_${employeeId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  };

  // Enhanced lead processing
  const enhanceLeadsWithAI = (rawLeads) => {
    return rawLeads.map((lead) => {
      // Calculate AI Score based on various factors
      let aiScore = 50 // Base score

      // Boost score based on priority
      if (lead.priority === "urgent") aiScore += 30
      else if (lead.priority === "high") aiScore += 20
      else if (lead.priority === "medium") aiScore += 10

      // Boost based on status
      if (lead.status === "new") aiScore += 15
      if (lead.status === "interested") aiScore += 25

      // Boost based on recent activity
      const createdAt = new Date(lead.timestamp_created)
      const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceCreated < 1) aiScore += 20
      else if (hoursSinceCreated < 24) aiScore += 10

      // Boost based on contact attempts
      if (lead.phone_number && lead.email_id) aiScore += 10

      // Cap at 100
      aiScore = Math.min(aiScore, 100)

      // Determine lead temperature
      let leadTemperature = "Cold"
      if (aiScore >= 85) leadTemperature = "Hot"
      else if (aiScore >= 60) leadTemperature = "Warm"

      // Generate intent signals based on available data
      const intentSignals = []
      if (lead.subjects && lead.subjects.length > 50) intentSignals.push("Detailed inquiry")
      if (lead.phone_number) intentSignals.push("Provided phone number")
      if (lead.email_id) intentSignals.push("Provided email")
      if (lead.priority === "urgent") intentSignals.push("Marked as urgent")
      if (intentSignals.length === 0) intentSignals.push("Basic inquiry")

      // Determine urgency and time to contact
      let urgency = "This week"
      let timeToContact = "1 day"

      if (lead.priority === "urgent") {
        urgency = "Immediate"
        timeToContact = "< 5 min"
      } else if (lead.priority === "high") {
        urgency = "Today"
        timeToContact = "15 min"
      } else if (lead.priority === "medium") {
        urgency = "Within 24 hours"
        timeToContact = "2 hours"
      }

      // Check if lead is due
      const isDue = lead.next_follow_up
        ? new Date(lead.next_follow_up) <= new Date()
        : lead.priority === "urgent" || lead.priority === "high"

      // Get last activity
      const lastActivity = lead.updated_at
        ? getTimeAgo(new Date(lead.updated_at))
        : getTimeAgo(new Date(lead.timestamp_created))

      return {
        ...lead,
        aiScore,
        leadTemperature,
        intentSignals,
        urgency,
        timeToContact,
        isDue,
        lastActivity,
      }
    })
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
  }

  // Enhanced lead categorization
  const getLeadsByPriority = useMemo(() => {
    const enhancedLeads = enhanceLeadsWithAI(leads)
    const filtered = enhancedLeads.filter((lead) => !skippedLeads.has(lead.id))

    const critical = filtered.filter((lead) => lead.priority === "urgent" && lead.aiScore >= 85)
    const hot = filtered.filter((lead) => lead.leadTemperature === "Hot")
    const warm = filtered.filter((lead) => lead.leadTemperature === "Warm")
    const medium = filtered.filter((lead) => lead.priority === "medium")
    const cold = filtered.filter((lead) => lead.leadTemperature === "Cold")

    return { critical, hot, warm, medium, cold, all: enhancedLeads }
  }, [leads, skippedLeads])

  // Daily summary
  const getDailySummary = () => {
    const priorities = getLeadsByPriority
    const total = leads.length - skippedLeads.size
    const dueNow = priorities.all.filter(
      (lead) =>
        lead.isDue &&
        !skippedLeads.has(lead.id) &&
        (lead.urgency.includes("Immediate") || lead.urgency.includes("< 5 min")),
    ).length

    return {
      total,
      critical: priorities.critical.length,
      hot: priorities.hot.length,
      warm: priorities.warm.length,
      medium: priorities.medium.length,
      cold: priorities.cold.length,
      dueNow,
      skipped: skippedLeads.size,
    }
  }

  const checkAuthStatus = useCallback(async () => {
    try {
      const isAuth = authService.isAuthenticated()
      if (isAuth) {
        const userProfile = authService.getCurrentUserProfile()
        if (userProfile) {
          setCurrentUser({
            id: userProfile.id,
            email: userProfile.email,
            employee_id: userProfile.employee_id,
          })
          setUserProfile(userProfile)
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error("Auth check error:", err)
      setIsAuthenticated(false)
    }
  }, [])



  const loadEmployees = useCallback(async () => {
    try {
      let query = supabase.from("employees").select("*")

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%`,
        )
      }

      if (filterRole) {
        query = query.eq("role", filterRole)
      }

      if (filterStatus) {
        query = query.eq("status", filterStatus)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("Load employees error:", error)
        setEmployees([])
        return
      }
      setEmployees(data || [])
    } catch (err) {
      console.error("Load employees error:", err)
      setEmployees([])
    }
  }, [searchTerm, filterRole, filterStatus])

  const loadActivityLogs = useCallback(async () => {
    try {
      // Load from activity_logs table with employee info
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Load activity logs error:", error)
        setActivityLogs([])
        return
      }

      // Flatten the data structure
      const flattenedLogs = (data || []).map((log) => ({
        ...log,
        first_name: log.employees?.first_name || "Unknown",
        last_name: log.employees?.last_name || "User",
        employee_id: log.employees?.employee_id || "N/A",
      }))

      setActivityLogs(flattenedLogs)
    } catch (err) {
      console.error("Load activity logs error:", err)
      setActivityLogs([])
    }
  }, [])

  const loadLeads = useCallback(async () => {
    try {
      if (!userProfile?.employee_id) {
        console.log("No employee_id available for loading leads");
        setLeads([]);
        return;
      }

      const employeeId = userProfile.employee_id;
      console.log("Loading leads for employee_id:", employeeId);

      const tableName = getAgentTableName(employeeId);
      console.log("Querying table:", tableName);

      let query = supabase.from(tableName).select("*");

      if (leadSearchTerm) {
        query = query.or(
          `name_of_client.ilike.%${leadSearchTerm}%,phone_number.ilike.%${leadSearchTerm}%,email_id.ilike.%${leadSearchTerm}%,subjects.ilike.%${leadSearchTerm}%`,
        );
      }

      if (leadFilterStatus) {
        query = query.eq("status", leadFilterStatus);
      }

      if (leadFilterPriority) {
        query = query.eq("priority", leadFilterPriority);
      }

      const { data, error } = await query.order("timestamp_created", { ascending: false });

      if (error) {
        console.error("Load leads error:", error);
        setError("Failed to load leads: " + error.message);
        setLeads([]);
        return;
      }

      console.log(`Successfully loaded ${data?.length || 0} leads`);
      setLeads(data || []);
      setError("");
    } catch (err) {
      console.error("Load leads error:", err);
      setError("Failed to load leads");
      setLeads([]);
    }
  }, [userProfile, leadSearchTerm, leadFilterStatus, leadFilterPriority]);

  const handleLeadClick = (lead) => {
    setSelectedLead(lead)
    setLeadUpdateForm({
      status: lead.status || "new",
      call_status: lead.call_status || "pending",
      user_remark: lead.user_remark || "",
      next_follow_up: lead.next_follow_up ? lead.next_follow_up.split("T")[0] : "",
    })
    setShowLeadModal(true)
  }

  // const handleUpdateLead = async () => {
  //   if (!selectedLead) return

  //   setLoading(true)
  //   try {
  //     const updateData = {
  //       status: leadUpdateForm.status,
  //       call_status: leadUpdateForm.call_status,
  //       user_remark: leadUpdateForm.user_remark,
  //       next_follow_up: leadUpdateForm.next_follow_up ? `${leadUpdateForm.next_follow_up}T09:00:00` : null,
  //       updated_at: new Date().toISOString(),
  //     }

  //     if (leadUpdateForm.call_status === "completed") {
  //       updateData.last_called_at = new Date().toISOString()
  //     }

  //     const { error } = await supabase.from(tableName).update(updateData).eq("id", selectedLead.id)

  //     if (error) {
  //       console.error("Update lead error:", error)
  //       setError("Failed to update lead: " + error.message)
  //       return
  //     }

  //     await logActivity("Lead Updated", {
  //       lead_id: selectedLead.id,
  //       lead_name: selectedLead.name_of_client,
  //       status: leadUpdateForm.status,
  //     })

  //     setShowLeadModal(false)
  //     await loadLeads()
  //     setError("")
  //   } catch (err) {
  //     console.error("Update lead error:", err)
  //     setError(err.message || "Failed to update lead")
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleUpdateLead = async () => {
    if (!selectedLead || !userProfile) return;

    setLoading(true);
    try {
      const tableName = getAgentTableName(userProfile.employee_id);
      if (!tableName) throw new Error("Invalid agent table name");

      const updateData = {
        status: leadUpdateForm.status,
        call_status: leadUpdateForm.call_status,
        user_remark: leadUpdateForm.user_remark,
        next_follow_up: leadUpdateForm.next_follow_up ? `${leadUpdateForm.next_follow_up}T09:00:00` : null,
        updated_at: new Date().toISOString(),
      };

      if (leadUpdateForm.call_status === "completed") {
        updateData.last_called_at = new Date().toISOString();
      }

      const { error } = await supabase.from(tableName).update(updateData).eq("id", selectedLead.id);

      if (error) {
        console.error("Update lead error:", error);
        setError("Failed to update lead: " + error.message);
        return;
      }

      await logActivity("Lead Updated", {
        lead_id: selectedLead.id,
        lead_name: selectedLead.name_of_client,
        status: leadUpdateForm.status,
        table_name: tableName
      });

      setShowLeadModal(false);
      await loadLeads();
      setError("");
    } catch (err) {
      console.error("Update lead error:", err);
      setError(err.message || "Failed to update lead");
    } finally {
      setLoading(false);
    }
  };

  // const makeCall = async (lead) => {
  //   try {
  //     await logActivity("Call Initiated", {
  //       lead_id: lead.id,
  //       lead_name: lead.name_of_client,
  //       phone: lead.phone_number,
  //     })

  //     // Update call status to in_progress
  //     const { error } = await supabase
  //       .from("leads_sadik")
  //       .update({
  //         call_status: "in_progress",
  //         updated_at: new Date().toISOString(),
  //       })
  //       .eq("id", lead.id)

  //     if (error) {
  //       console.error("Call status update error:", error)
  //     }

  //     await loadLeads()
  //     alert(`Calling ${lead.name_of_client} at ${lead.phone_number}`)
  //   } catch (err) {
  //     console.error("Call initiation error:", err)
  //   }
  // }
  const makeCall = async (lead) => {
    try {
      if (!userProfile) return;

      const tableName = getAgentTableName(userProfile.employee_id);
      if (!tableName) throw new Error("Invalid agent table name");

      await logActivity("Call Initiated", {
        lead_id: lead.id,
        lead_name: lead.name_of_client,
        phone: lead.phone_number,
        table_name: tableName
      });

      // Update call status to in_progress
      const { error } = await supabase
        .from(tableName)
        .update({
          call_status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (error) {
        console.error("Call status update error:", error);
      }

      await loadLeads();
      alert(`Calling ${lead.name_of_client} at ${lead.phone_number}`);
    } catch (err) {
      console.error("Call initiation error:", err);
    }
  };

  const logActivity = async (action, details = null) => {
    try {
      if (!currentUser) return

      const { error } = await supabase.from("activity_logs").insert([
        {
          user_id: currentUser.id,
          action: action,
          details: details,
          user_ip: null,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) {
        console.log("Activity logging error:", error.message)
      }
    } catch (err) {
      console.log("Activity log error:", err)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    try {
      if (!loginForm.email || !loginForm.password || !loginForm.company) {
        setError("Please fill in all fields")
        setLoading(false)
        return
      }
      const { data, error } = await authService.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        setCurrentUser(data.user)
        setUserProfile(authService.getCurrentUserProfile())
        setIsAuthenticated(true)
        setLoginForm({ email: "", password: "", company: loginForm.company })

        await logActivity("Login", {
          email: loginForm.email,
          login_time: new Date().toISOString(),
        })
      }
    } catch (err) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }



  const handleLogout = async () => {
    try {
      await logActivity("Logout", {
        logout_time: new Date().toISOString(),
      })

      await authService.signOut()
      setIsAuthenticated(false)
      setCurrentUser(null)
      setUserProfile(null)
      setActiveTab("dashboard")
      setEmployees([])
      setActivityLogs([])
      setLeads([])
      setSidebarOpen(false)
    } catch (err) {
      console.error("Logout error:", err)
    }
  }



  const handleSignup = async (userData) => {
    try {
      const { data, error } = await authService.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: userData,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      await logActivity("Employee Created", {
        employee_id: userData.employee_id,
        created_by: currentUser?.employee_id,
      })

      return { success: true }
    } catch (err) {
      console.error("Signup error:", err)
      return { success: false, error: err.message }
    }
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setEmployeeForm({
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "agent",
      department: "",
      password: "",
    })
    setShowEmployeeModal(true)
  }



  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp)
    setEmployeeForm({
      employee_id: emp.employee_id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || "",
      role: emp.role,
      department: emp.department || "",
      password: "",
    })
    setShowEmployeeModal(true)
  }

  const handleSaveEmployee = async () => {
    setLoading(true)
    try {
      if (editingEmployee) {
        const updateData = {
          first_name: employeeForm.first_name,
          last_name: employeeForm.last_name,
          phone: employeeForm.phone,
          role: employeeForm.role,
          department: employeeForm.department,
          updated_at: new Date().toISOString(),
        }

        // Only update password if provided
        if (employeeForm.password) {
          updateData.password = employeeForm.password
        }

        const { error } = await supabase.from("employees").update(updateData).eq("id", editingEmployee.id)

        if (error) throw error

        await logActivity("Employee Updated", {
          employee_id: employeeForm.employee_id,
          updated_by: currentUser?.employee_id,
        })
      } else {
        const result = await handleSignup(employeeForm)
        if (!result.success) {
          throw new Error(result.error)
        }
      }

      setShowEmployeeModal(false)
      await loadEmployees()
    } catch (err) {
      setError(err.message || "Failed to save employee")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm("Are you sure you want to deactivate this employee?")) return

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", empId)

      if (error) throw error

      await logActivity("Employee Deactivated", {
        employee_id: empId,
        deactivated_by: currentUser?.employee_id,
      })

      await loadEmployees()
    } catch (err) {
      setError(err.message || "Failed to deactivate employee")
    }
  }

  // Skip/unskip functions
  const skipLead = (leadId) => {
    setSkippedLeads((prev) => new Set([...prev, leadId]))
  }

  const unskipLead = (leadId) => {
    setSkippedLeads((prev) => {
      const newSet = new Set(prev)
      newSet.delete(leadId)
      return newSet
    })
  }

  // Helper functions for enhanced UI
  const getPriorityDisplay = (lead) => {
    if (lead.priority === "urgent") {
      return {
        color: "bg-red-500 text-white border-red-600",
        icon: <AlertTriangle className="w-4 h-4" />,
        pulse: "animate-pulse",
      }
    } else if (lead.leadTemperature === "Hot") {
      return {
        color: "bg-orange-500 text-white border-orange-600",
        icon: <Flame className="w-4 h-4" />,
        pulse: "",
      }
    } else if (lead.leadTemperature === "Warm") {
      return {
        color: "bg-yellow-500 text-white border-yellow-600",
        icon: <ThermometerSun className="w-4 h-4" />,
        pulse: "",
      }
    } else if (lead.leadTemperature === "Cold") {
      return {
        color: "bg-blue-200 text-blue-800 border-blue-300",
        icon: <Snowflake className="w-4 h-4" />,
        pulse: "",
      }
    }
    return {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Eye className="w-4 h-4" />,
      pulse: "",
    }
  }

  const getAIScoreColor = (score) => {
    if (score >= 85) return "text-green-600 font-bold"
    if (score >= 70) return "text-yellow-600 font-semibold"
    if (score >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const getSourceIcon = (source) => {
    const icons = {
      website: <TrendingUp className="w-4 h-4 text-blue-500" />,
      facebook: <MessageSquare className="w-4 h-4 text-blue-600" />,
      google: <TrendingUp className="w-4 h-4 text-green-500" />,
      phone: <Phone className="w-4 h-4 text-green-500" />,
      email: <Mail className="w-4 h-4 text-orange-500" />,
    }
    return icons[source?.toLowerCase()] || <Eye className="w-4 h-4 text-gray-500" />
  }

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus]);

  // Load data when authenticated
  // useEffect(() => {
  //   if (isAuthenticated && userProfile) {
  //     loadEmployees()
  //     loadActivityLogs()
  //     loadLeads()
  //   }
  // }, [isAuthenticated, userProfile, loadEmployees, loadActivityLogs, loadLeads])

  // Load data when authenticated and profile is available


  // Reload leads when filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadLeads()
    }
  }, [isAuthenticated, loadLeads])

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchTerm ||
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = !filterRole || emp.role === filterRole
    const matchesStatus = !filterStatus || emp.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  // Enhanced leads filtering
  const filteredAndSortedLeads = useMemo(() => {
    const enhancedLeads = enhanceLeadsWithAI(leads)

    const filtered = enhancedLeads.filter((lead) => {
      if (skippedLeads.has(lead.id)) return false
      if (showOnlyDue && !lead.isDue) return false

      const matchesSearch =
        !leadSearchTerm ||
        lead.name_of_client?.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        lead.phone_number?.includes(leadSearchTerm) ||
        lead.email_id?.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        lead.subjects?.toLowerCase().includes(leadSearchTerm.toLowerCase())

      const matchesStatus = !leadFilterStatus || lead.status === leadFilterStatus
      const matchesPriority = !leadFilterPriority || lead.priority === leadFilterPriority
      const matchesTemperature = !leadFilterTemperature || lead.leadTemperature === leadFilterTemperature

      return matchesSearch && matchesStatus && matchesPriority && matchesTemperature
    })

    // Sort by AI score by default
    filtered.sort((a, b) => b.aiScore - a.aiScore)

    return filtered
  }, [leads, leadSearchTerm, leadFilterStatus, leadFilterPriority, leadFilterTemperature, showOnlyDue, skippedLeads])

  // Dashboard statistics
  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((emp) => emp.status === "active").length,
    totalAgents: employees.filter((emp) => emp.role === "agent").length,
    totalManagers: employees.filter((emp) => emp.role === "manager").length,
    loggedInToday: employees.filter((emp) => {
      if (!emp.last_login) return false
      const today = new Date().toDateString()
      const loginDate = new Date(emp.last_login).toDateString()
      return today === loginDate
    }).length,
  }

  // Lead statistics
  const leadStats = {
    totalLeads: leads.length,
    newLeads: leads.filter((lead) => lead.status === "new").length,
    hotLeads: leads.filter((lead) => lead.priority === "urgent" || lead.priority === "high").length,
    followUpToday: leads.filter((lead) => {
      if (!lead.next_follow_up) return false
      const today = new Date().toDateString()
      const followUpDate = new Date(lead.next_follow_up).toDateString()
      return today === followUpDate
    }).length,
    convertedLeads: leads.filter((lead) => lead.status === "converted").length,
  }

  // Login component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            {/* <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-4">
              <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div> */}
            <div className="mb-4">
              <img
                src="/Logo_new tagline.png"
                alt="Company Logo"
                className="w-32 h-auto mx-auto"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full">
                <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Calling Agent Dashboard</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Sign in with your credentials</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}



          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                value={loginForm.company}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, company: e.target.value }))}
              >
                <option value="" selected disabled>select company</option>
                <option value="KTAHV">KTAHV</option>
                <option value="KAPPL">KAPPL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Enter your email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get current time for dashboard
  // const currentTime = new Date()
  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  const summary = getDailySummary()

  // Main dashboard - Complete JSX content
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* <div className="flex h-screen bg-gray-50"> */}
      <div className="flex flex-1 bg-gray-50"> {/*na*/}

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
        >
          <div className="flex items-center justify-between h-16 px-4 bg-cyan-800">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-white mr-2" />
              <span className="text-xl font-bold text-white">ConnectDesk</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-white hover:bg-cyan-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Adding role-based navigation with analytics and management tabs */}
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "dashboard" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <TrendingUp className="mr-3 h-5 w-5" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab("leads")}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "leads" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <Phone className="mr-3 h-5 w-5" />
                AI Calling Panel
                {leadStats.followUpToday > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {leadStats.followUpToday}
                  </span>
                )}
              </button>

              {(userProfile?.role === "admin" || userProfile?.role === "manager") && (
                <>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "analytics" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <TrendingUp className="mr-3 h-5 w-5" />
                    Analytics
                  </button>

                  <button
                    onClick={() => setActiveTab("management")}
                    className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "management" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <Target className="mr-3 h-5 w-5" />
                    Team Management
                  </button>
                </>
              )}

              {userProfile?.role === "admin" && (
                <button
                  onClick={() => setActiveTab("employees")}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "employees" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  <Users className="mr-3 h-5 w-5" />
                  Employees ({stats.totalEmployees})
                </button>
              )}

              {(userProfile?.role === "admin" || userProfile?.role === "manager") && (
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "activity" ? "bg-cyan-100 text-cyan-800" : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  <Shield className="mr-3 h-5 w-5" />
                  Activity Logs
                </button>
              )}
            </div>
          </nav>
          {/* p-4 */}
          {/* bg-gray-100  */}
          <div className="absolute bottom-0 w-full ">
            <div className="rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-cyan-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userProfile?.first_name?.charAt(0) || "U"}</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{loginForm?.company} | {userProfile?.role}</p>
                  {/* <p className="text-xs text-gray-500"></p> */}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-3 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6" />
                </button>
                {/* Updated header to show correct tab names */}
                <h1 className="ml-2 text-xl font-semibold text-gray-900 truncate">
                  {activeTab === "dashboard" && "Dashboard Overview"}
                  {activeTab === "leads" && "Calling Panel"}
                  {activeTab === "analytics" && "Analytics & Reports"}
                  {activeTab === "management" && "Team Management"}
                  {activeTab === "employees" && "Employee Management"}
                  {activeTab === "activity" && "Activity Logs"}
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Daily Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Critical Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.critical}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Flame className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Hot Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.hot}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <ThermometerSun className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Warm Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.warm}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Active</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-cyan-600">{summary.dueNow}</p>
                        <p className="text-sm text-gray-600">Due Now</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{leadStats.newLeads}</p>
                        <p className="text-sm text-gray-600">New Leads</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{leadStats.convertedLeads}</p>
                        <p className="text-sm text-gray-600">Converted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{summary.skipped}</p>
                        <p className="text-sm text-gray-600">Skipped</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "leads" && (
              <div className="space-y-6">
                {/* Lead Filters */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                    />

                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={leadFilterStatus}
                      onChange={(e) => setLeadFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option value="new">New</option>
                      <option value="followup">FollowUp</option>
                      {/* <option value="interested">Interested</option>
                      <option value="converted">Converted</option>
                      <option value="not_interested">Not Interested</option> */}
                    </select>

                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={leadFilterTemperature}
                      onChange={(e) => setLeadFilterTemperature(e.target.value)}
                    >
                      <option value="">All Temperature</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showOnlyDue}
                        onChange={(e) => setShowOnlyDue(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Due Only</span>
                    </label>
                  </div>
                </div>

                {/* Leads List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Leads ({filteredAndSortedLeads.length})</h3>

                    {filteredAndSortedLeads.length === 0 ? (
                      <div className="text-center py-8">
                        <Phone className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search terms.</p>
                      </div>
                    ) : (
                      <div className="leads-scroller space-y-4">
                        {filteredAndSortedLeads.map((lead, index) => {
                          const priorityDisplay = getPriorityDisplay(lead);
                          return (
                            <div>
                              <div
                                key={lead.id}
                                className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${priorityDisplay.pulse}`}
                                onClick={() => handleLeadClick(lead)}
                              >
                                {/* Header - Lead Name & Priority */}
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h4 className="text-lg font-medium text-gray-900">
                                      {lead.name_of_client || "No Name"}
                                    </h4>
                                    <p className="text-sm text-gray-500">Lead ID: {lead.current_id}</p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${priorityDisplay.color}`}
                                    >
                                      {priorityDisplay.icon}
                                      <span className="ml-1">{lead.leadTemperature}</span>
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">AI Score: {lead.aiScore}%</p>
                                  </div>
                                </div>

                                {/* Quick Contact Info */}
                                <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">PHONE</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {lead.phone_number || "Not Available"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">EMAIL</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {lead.email_id || "Not Available"}
                                    </p>
                                  </div>
                                </div>

                                {/* Contact Preferences - Agent Important Info */}
                                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs font-semibold text-blue-800 mb-1">BEST WAY TO CONTACT</p>
                                      <p className="text-sm text-blue-700">
                                        {lead.preferred_way_to_interact || "No preference"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-blue-800 mb-1">BEST TIME TO CALL</p>
                                      <p className="text-sm text-blue-700">
                                        {lead.preferred_datetime_contact
                                          ? new Date(lead.preferred_datetime_contact).toLocaleString()
                                          : "Anytime"
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Client Type & Category */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                    {lead.client_category || "General Client"}
                                  </span>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    Status: {lead.status || "New"}
                                  </span>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                    {lead.lastActivity}
                                  </span>
                                </div>

                                {/* Lead Summary for Context */}
                                {lead.lead_summary && (
                                  <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                                    <p className="text-xs font-semibold text-yellow-800 mb-1">AGENT NOTES:</p>
                                    <p className="text-sm text-yellow-700">{lead.lead_summary}</p>
                                  </div>
                                )}

                                {/* Subject/Inquiry */}
                                {lead.subjects && (
                                  <div className="mb-3 p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs font-semibold text-green-800 mb-1">CLIENT INQUIRY:</p>
                                    <p className="text-sm text-green-700 line-clamp-2">{lead.subjects}</p>
                                  </div>
                                )}

                                {/* Action Buttons - Prioritized for agents */}
                                <div className="flex flex-wrap gap-2 justify-start">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      makeCall(lead);
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium flex items-center"
                                  >
                                    <Phone className="h-4 w-4 mr-2" />
                                    CALL NOW
                                  </button>

                                  {lead.phone_number && (
                                    <a
                                      href={`https://wa.me/${lead.phone_number.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium flex items-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MessageCircle className="h-4 w-4 mr-2" />
                                      WhatsApp
                                    </a>
                                  )}

                                  {lead.email_id && (
                                    <a
                                      href={`mailto:${lead.email_id}`}
                                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Email
                                    </a>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                      setShowLeadDetails(true);
                                    }}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium flex items-center"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </button>

                                  {lead.leadTemperature === "Cold" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        skipLead(lead.id);
                                      }}
                                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center"
                                    >
                                      <SkipForward className="w-4 h-4 mr-2" />
                                      Skip
                                    </button>
                                  )}
                                </div>
                              </div>

                              {index !== filteredAndSortedLeads.length - 1 && (
                                <hr className="my-6 border-t border-gray-200" />
                              )}
                            </div>

                          );
                        })}


                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "employees" && (
              <div className="space-y-6">
                {/* Employee Management Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                    <p className="text-gray-600">Manage your calling agents and team members</p>
                  </div>
                  <button
                    onClick={handleAddEmployee}
                    className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Add Employee
                  </button>
                </div>

                {/* Employee Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Employees</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeEmployees}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Phone className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Agents</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Managers</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalManagers}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Filters */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="agent">Agent</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>

                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Employee List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Employees ({filteredEmployees.length})</h3>

                    {filteredEmployees.length === 0 ? (
                      <div className="text-center py-8">
                        <Eye className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or add a new employee.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEmployees.map((employee) => (
                              <tr key={employee.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                                      <span className="text-cyan-800 font-medium">
                                        {employee.first_name?.charAt(0)}
                                        {employee.last_name?.charAt(0)}
                                      </span>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {employee.first_name} {employee.last_name}
                                      </div>
                                      <div className="text-sm text-gray-500">{employee.email}</div>
                                      <div className="text-xs text-gray-400">ID: {employee.employee_id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.role === "admin"
                                      ? "bg-purple-100 text-purple-800"
                                      : employee.role === "manager"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                      }`}
                                  >
                                    {employee.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {employee.department || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                      }`}
                                  >
                                    {employee.status || "active"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                  <button
                                    onClick={() => handleEditEmployee(employee)}
                                    className="text-cyan-600 hover:text-cyan-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Deactivate
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>

                    {activityLogs.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Activity will appear here as team members use the system.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">
                                  {log.first_name} {log.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{getTimeAgo(new Date(log.created_at))}</p>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{log.action}</p>
                              {log.details && (
                                <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border">
                                  <pre className="whitespace-pre-wrap">
                                    {typeof log.details === "object"
                                      ? JSON.stringify(log.details, null, 2)
                                      : log.details}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === "analytics" && (userProfile?.role === "admin" || userProfile?.role === "manager") && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h2>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <Phone className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Calls Today</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {
                            activityLogs.filter(
                              (log) =>
                                log.action?.includes("called") &&
                                new Date(log.created_at).toDateString() === new Date().toDateString(),
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <Star className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {leadStats.totalLeads > 0
                            ? Math.round((leadStats.convertedLeads / leadStats.totalLeads) * 100)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Hot Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{leadStats.hotLeads}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Agents</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Performance */}
                <div className="bg-white rounded-lg shadow-sm mb-8">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {employees
                        .filter((emp) => emp.role === "agent")
                        .map((agent) => {
                          const agentCalls = activityLogs.filter(
                            (log) => log.employee_id === agent.employee_id && log.action?.includes("called"),
                          ).length
                          return (
                            <div
                              key={agent.employee_id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-cyan-800 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium">{agent.first_name?.charAt(0)}</span>
                                </div>
                                <div className="ml-4">
                                  <p className="font-medium text-gray-900">
                                    {agent.first_name} {agent.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">{agent.department}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{agentCalls}</p>
                                <p className="text-sm text-gray-500">Calls Made</p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "management" && (userProfile?.role === "admin" || userProfile?.role === "manager") && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Management</h2>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center mb-4">
                      <Target className="h-8 w-8 text-blue-600" />
                      <h3 className="ml-3 text-lg font-semibold text-gray-900">Daily Targets</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Set and monitor daily calling targets for your team</p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                      Set Targets
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center mb-4">
                      <Users className="h-8 w-8 text-green-600" />
                      <h3 className="ml-3 text-lg font-semibold text-gray-900">Team Assignments</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Assign leads to specific team members</p>
                    <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                      Assign Leads
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center mb-4">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <h3 className="ml-3 text-lg font-semibold text-gray-900">Performance Review</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Review team performance and provide feedback</p>
                    <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">
                      Review Team
                    </button>
                  </div>
                </div>

                {/* Team Overview */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Team Overview</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {employees.map((employee) => (
                        <div key={employee.employee_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <div className="w-12 h-12 bg-cyan-800 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">{employee.first_name?.charAt(0)}</span>
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">
                                {employee.first_name} {employee.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{employee.role}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Department:</span>
                              <span className="text-sm font-medium">{employee.department || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Status:</span>
                              <span
                                className={`text-sm font-medium ${employee.status === "active" ? "text-green-600" : "text-red-600"}`}
                              >
                                {employee.status || "Active"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add Footer Here */}
      {/* border-gray-200 */}
      {/* <footer className="bg-white border-t ">
  <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col sm:flex-row justify-between items-center">
      <div className="text-sm text-gray-500">
        © 2025 Kairali Ayurvedic Group. All rights reserved.
      </div>
      <div className="text-sm text-gray-500 mt-2 sm:mt-0 text-center sm:text-right">
        Developed by Satyam Kumar | Support: <a href="mailto:dme@kairali.com" className="underline">dme@kairali.com</a> | Version 1.0.1
      </div>
    </div>
  </div>
</footer> */}
      <footer className="bg-cyan-800  border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 ">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-white">

            {/* Left - Company */}
            <div className="mb-2 sm:mb-0">
              © 2025 <span className="font-medium">Kairali Ayurvedic Group</span>. All rights reserved.
            </div>

            {/* Right - Dev & Support */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div>Developed by <span className="font-medium">Satyam Kumar</span></div>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12H8m0 0H6m2 0v8m0-8V4m0 8h8" />
                </svg>
                <a href="mailto:dme@kairali.com" className="underline hover:text-gray-700">dme@kairali.com</a>
              </div>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version 1.0.1
              </div>
            </div>
          </div>
        </div>
      </footer>



      {/* Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Lead</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={leadUpdateForm.status}
                  onChange={(e) => setLeadUpdateForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="converted">Converted</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={leadUpdateForm.call_status}
                  onChange={(e) => setLeadUpdateForm((prev) => ({ ...prev, call_status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Remark</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={leadUpdateForm.user_remark}
                  onChange={(e) => setLeadUpdateForm((prev) => ({ ...prev, user_remark: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow Up</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={leadUpdateForm.next_follow_up}
                  onChange={(e) => setLeadUpdateForm((prev) => ({ ...prev, next_follow_up: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => { console.log("[v0] Cancel clicked"); setSelectedLead(null); setShowLeadModal(false) }}
                  className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLead}
                  disabled={loading}
                  className="bg-cyan-600 text-white py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
              {/* Lead Details Modal */}
              {showLeadDetails && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Lead Details</h2>
                      <button
                        onClick={() => setShowLeadDetails(false)}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Lead Information in organized sections */}
                    <div className="space-y-6">

                      {/* Basic Information Section */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">ID:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.id || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Original ID:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.original_id || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Current ID:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.current_id || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Client Name:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.name_of_client || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Created:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.timestamp_created ? new Date(selectedLead.timestamp_created).toLocaleString() : "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Enquiry Date:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.enquiry_date_time ? new Date(selectedLead.enquiry_date_time).toLocaleString() : "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">Primary Phone:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.phone_number || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Alternative Phone:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.alt_phone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Primary Email:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.email_id || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Alternative Email:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.alt_email || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lead Classification Section */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Classification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">Priority:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.priority || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Urgency:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.urgency || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Client Category:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.client_category || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Client Type:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.client_type || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Level:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.level || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Assigned To:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.assign_to || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Location Information Section */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">Country:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.country || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">State:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.state || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Pincode:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.pincode || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Source & Campaign Information Section */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source & Campaign</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">Data Source:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.data_source || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Website Name:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.website_name || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Campaign Name:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.campaign_name || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">URL:</span>
                            <span className="ml-2 text-gray-900 break-all">{selectedLead.url || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sales Strategy Section */}
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Strategy</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-600">How to Sell:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.how_to_sell || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">What to Sell:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.what_to_sell || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Key Points to Keep in Mind:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.key_points_keep_in_mind || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Interaction Preferences Section */}
                      <div className="bg-pink-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interaction Preferences</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-600">Preferred Way to Interact:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.preferred_way_to_interact || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Non-Preferred Way to Interact:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.non_preferred_way_to_interact || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Preferred Contact Time:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.preferred_datetime_contact || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Analysis Section */}
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-600">Lead Intent Data:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.lead_intent_data || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Lead Outcome by AI:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.lead_outcome_by_ai || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Lead Summary:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.lead_summary || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Description & Notes Section */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Description & Notes</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-600">Subject/Description:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.subjects || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Notes:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.notes || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">User Remarks:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.user_remark || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Remarks History:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.remarks_history || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {/* History & Previous Interactions Section */}
                      <div className="bg-red-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">History & Previous Interactions</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-600">Buying History:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.buying_history || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Previous Call URL:</span>
                            <p className="text-gray-900 mt-1 break-all">{selectedLead.previous_call_url || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Discharge Summary:</span>
                            <p className="text-gray-900 mt-1">{selectedLead.discharge_summary || "N/A"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Last Updated:</span>
                            <span className="ml-2 text-gray-900">{selectedLead.updated_at ? new Date(selectedLead.updated_at).toLocaleString() : "N/A"}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Close Button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowLeadDetails(false)}
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={employeeForm.employee_id}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                  disabled={editingEmployee}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    value={employeeForm.first_name}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    value={employeeForm.last_name}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="agent">Agent</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={employeeForm.password}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingEmployee ? "Leave blank to keep current password" : "Enter password"}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  disabled={loading}
                  className="bg-cyan-600 text-white py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>




      )}
      {/* Footer */}
      {/* <footer className="bg-gray-800 text-white">
  <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">ConnectDesk</h3>
        <p className="text-gray-300 text-sm">
          Advanced calling agent dashboard for efficient lead management.
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">License</h3>
        <p className="text-gray-300 text-sm">
          MIT License - Open Source Software
        </p>
        <p className="text-gray-300 text-sm">
          Version 1.0.0
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Support</h3>
        <p className="text-gray-300 text-sm">
          For technical support, contact your administrator.
        </p>
      </div>
    </div>
    <div className="border-t border-gray-700 mt-6 pt-4 text-center">
      <p className="text-gray-300 text-sm">
        © 2025 Your Company Name. All rights reserved.
      </p>
    </div>
  </div>
</footer> */}


    </div>
  )
}

export default CallingAgentDashboard
