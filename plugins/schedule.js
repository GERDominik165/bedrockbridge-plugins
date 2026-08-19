// schedule-manager.js - Professional Schedule Manager for BedrockBridge
// Version: 2.0.0 - Enterprise-grade scheduling system
// Inspired by Pterodactyl's scheduling system

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

// ================== BEDROCKBRIDGE INTEGRATION ==================
let bridge, database;

try {
  const bridgeModule = await import("../addons");
  bridge = bridgeModule.bridge;
  database = bridgeModule.database;
  console.info("§a[ScheduleManager] BedrockBridge API loaded successfully");
} catch (error) {
  console.error("§c[ScheduleManager] Failed to load BedrockBridge API");
  throw error;
}

// ================== CONFIGURATION ==================
const CONFIG = {
  plugin: {
    name: "Schedule Manager",
    version: "2.0.0",
    author: "BedrockBridge Team",
    description: "Professional command scheduling system"
  },
  
  permissions: {
    use: "schedule.use",
    create: "schedule.create",
    delete: "schedule.delete",
    admin: "schedule.admin",
    bypass_limit: "schedule.bypass"
  },
  
  limits: {
    max_schedules_default: 5,
    max_schedules_vip: 15,
    max_schedules_admin: -1, // unlimited
    min_interval_seconds: 60,
    max_commands_per_schedule: 10,
    max_name_length: 50,
    max_description_length: 200
  },
  
  ui: {
    primary_color: "§b",
    secondary_color: "§3",
    success_color: "§a",
    error_color: "§c",
    warning_color: "§e",
    info_color: "§7"
  }
};

// ================== DATABASE SETUP ==================
const db = {
  schedules: database.makeTable("schedule_manager_schedules"),
  executions: database.makeTable("schedule_manager_executions"),
  templates: database.makeTable("schedule_manager_templates")
};

// ================== SCHEDULE TYPES ==================
const ScheduleType = {
  SINGLE: {
    id: "single",
    name: "Single Execution",
    icon: "⚡",
    description: "Runs once at a specific time"
  },
  RECURRING: {
    id: "recurring",
    name: "Recurring",
    icon: "🔄",
    description: "Repeats at regular intervals"
  },
  CRON: {
    id: "cron",
    name: "Cron Expression",
    icon: "⚙️",
    description: "Advanced scheduling with cron syntax"
  },
  DAILY: {
    id: "daily",
    name: "Daily",
    icon: "📅",
    description: "Runs every day at specific time(s)"
  },
  WEEKLY: {
    id: "weekly",
    name: "Weekly",
    icon: "📆",
    description: "Runs on specific days of the week"
  },
  MONTHLY: {
    id: "monthly",
    name: "Monthly",
    icon: "🗓️",
    description: "Runs on specific days of the month"
  }
};

// ================== TIME UTILITIES ==================
class TimeUtils {
  static formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  static getNextCronRun(cronExpression) {
    // Simplified cron parser - in production, use a proper cron library
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return null;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now);
    
    // Basic implementation for common patterns
    if (minute !== '*') next.setMinutes(parseInt(minute));
    if (hour !== '*') next.setHours(parseInt(hour));
    
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next.getTime();
  }
  
  static parseInterval(value, unit) {
    const multipliers = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      week: 604800000
    };
    
    return value * (multipliers[unit] || 1000);
  }
}

// ================== SCHEDULE CLASS ==================
class Schedule {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.description = data.description || "";
    this.type = data.type;
    this.enabled = data.enabled !== false;
    this.creator = data.creator;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Execution data
    this.commands = data.commands || [];
    this.lastExecution = data.lastExecution || null;
    this.nextExecution = data.nextExecution || null;
    this.executionCount = data.executionCount || 0;
    this.failureCount = data.failureCount || 0;
    
    // Schedule-specific data
    this.scheduleData = data.scheduleData || {};
    
    // Advanced options
    this.options = {
      runAsOp: data.options?.runAsOp || false,
      dimension: data.options?.dimension || "overworld",
      position: data.options?.position || null,
      notifyOnSuccess: data.options?.notifyOnSuccess !== false,
      notifyOnFailure: data.options?.notifyOnFailure !== false,
      continueOnError: data.options?.continueOnError || false,
      timeout: data.options?.timeout || 30000,
      retryOnFailure: data.options?.retryOnFailure || false,
      maxRetries: data.options?.maxRetries || 3
    };
    
    this.calculateNextExecution();
  }
  
  generateId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  calculateNextExecution() {
    const now = Date.now();
    
    switch (this.type) {
      case ScheduleType.SINGLE.id:
        if (this.scheduleData.timestamp > now) {
          this.nextExecution = this.scheduleData.timestamp;
        } else {
          this.nextExecution = null;
          this.enabled = false;
        }
        break;
        
      case ScheduleType.RECURRING.id:
        const interval = TimeUtils.parseInterval(
          this.scheduleData.interval,
          this.scheduleData.unit
        );
        this.nextExecution = this.lastExecution 
          ? this.lastExecution + interval 
          : now + interval;
        break;
        
      case ScheduleType.DAILY.id:
        const times = this.scheduleData.times || ["00:00"];
        const nextTimes = times.map(time => {
          const [hour, minute] = time.split(':').map(Number);
          const next = new Date();
          next.setHours(hour, minute, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1);
          return next.getTime();
        });
        this.nextExecution = Math.min(...nextTimes);
        break;
        
      case ScheduleType.WEEKLY.id:
        const days = this.scheduleData.days || [0]; // Sunday = 0
        const time = this.scheduleData.time || "00:00";
        const [hour, minute] = time.split(':').map(Number);
        
        const nextDates = [];
        for (let i = 0; i < 7; i++) {
          const next = new Date();
          next.setDate(next.getDate() + i);
          if (days.includes(next.getDay())) {
            next.setHours(hour, minute, 0, 0);
            if (next > now) {
              nextDates.push(next.getTime());
            }
          }
        }
        
        if (nextDates.length === 0) {
          // No valid day found in next week, go to next week
          const next = new Date();
          next.setDate(next.getDate() + 7);
          next.setHours(hour, minute, 0, 0);
          this.nextExecution = next.getTime();
        } else {
          this.nextExecution = Math.min(...nextDates);
        }
        break;
        
      case ScheduleType.MONTHLY.id:
        const monthDays = this.scheduleData.days || [1];
        const monthTime = this.scheduleData.time || "00:00";
        const [mHour, mMinute] = monthTime.split(':').map(Number);
        
        const nextMonthDates = [];
        const currentDate = new Date();
        
        for (const day of monthDays) {
          const next = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          next.setHours(mHour, mMinute, 0, 0);
          
          if (next > now) {
            nextMonthDates.push(next.getTime());
          } else {
            // Try next month
            next.setMonth(next.getMonth() + 1);
            nextMonthDates.push(next.getTime());
          }
        }
        
        this.nextExecution = Math.min(...nextMonthDates);
        break;
        
      case ScheduleType.CRON.id:
        this.nextExecution = TimeUtils.getNextCronRun(this.scheduleData.expression);
        break;
    }
  }
  
  async execute() {
    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scheduleId: this.id,
      startTime: Date.now(),
      endTime: null,
      success: true,
      results: [],
      error: null
    };
    
    try {
      const dimension = world.getDimension(this.options.dimension);
      
      for (let i = 0; i < this.commands.length; i++) {
        const command = this.commands[i];
        
        try {
          // Parse variables in command
          const parsedCommand = this.parseCommand(command);
          
          // Execute command
          const result = await dimension.runCommandAsync(parsedCommand);
          
          execution.results.push({
            command: parsedCommand,
            success: true,
            output: result
          });
          
        } catch (error) {
          execution.results.push({
            command: command,
            success: false,
            error: error.message
          });
          
          if (!this.options.continueOnError) {
            throw error;
          }
        }
        
        // Small delay between commands
        if (i < this.commands.length - 1) {
          await this.sleep(100);
        }
      }
      
      // Update schedule stats
      this.lastExecution = Date.now();
      this.executionCount++;
      this.calculateNextExecution();
      
    } catch (error) {
      execution.success = false;
      execution.error = error.message;
      this.failureCount++;
      
      // Handle retry logic
      if (this.options.retryOnFailure && execution.retryCount < this.options.maxRetries) {
        execution.retryCount = (execution.retryCount || 0) + 1;
        // Schedule retry
        system.runTimeout(() => {
          this.execute();
        }, 20 * 5); // 5 seconds
      }
    } finally {
      execution.endTime = Date.now();
      
      // Save execution log
      db.executions.set(execution.id, execution);
      
      // Send notifications
      this.sendNotifications(execution);
      
      // Save updated schedule
      this.save();
    }
    
    return execution;
  }
  
  parseCommand(command) {
    // Replace variables
    const variables = {
      '{player_count}': world.getAllPlayers().length,
      '{time}': new Date().toLocaleTimeString(),
      '{date}': new Date().toLocaleDateString(),
      '{schedule_name}': this.name,
      '{execution_count}': this.executionCount + 1,
      '{random}': Math.floor(Math.random() * 100)
    };
    
    let parsed = command;
    for (const [key, value] of Object.entries(variables)) {
      parsed = parsed.replace(new RegExp(key, 'g'), value);
    }
    
    return parsed;
  }
  
  sendNotifications(execution) {
    const creator = world.getAllPlayers().find(p => p.name === this.creator);
    if (!creator) return;
    
    if (execution.success && this.options.notifyOnSuccess) {
      creator.sendMessage(`${CONFIG.ui.success_color}[Schedule] "${this.name}" executed successfully!`);
    } else if (!execution.success && this.options.notifyOnFailure) {
      creator.sendMessage(`${CONFIG.ui.error_color}[Schedule] "${this.name}" failed: ${execution.error}`);
    }
  }
  
  save() {
    db.schedules.set(this.id, this.toJSON());
  }
  
  delete() {
    db.schedules.delete(this.id);
  }
  
  sleep(ms) {
    return new Promise(resolve => system.runTimeout(resolve, Math.ceil(ms / 50)));
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      enabled: this.enabled,
      creator: this.creator,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      commands: this.commands,
      lastExecution: this.lastExecution,
      nextExecution: this.nextExecution,
      executionCount: this.executionCount,
      failureCount: this.failureCount,
      scheduleData: this.scheduleData,
      options: this.options
    };
  }
}

// ================== SCHEDULE MANAGER ==================
class ScheduleManager {
  static schedules = new Map();
  static initialized = false;
  
  static async initialize() {
    if (this.initialized) return;
    
    // Load schedules from database
    for (const [id, data] of db.schedules.entries()) {
      this.schedules.set(id, new Schedule(data));
    }
    
    // Start execution loop
    system.runInterval(() => {
      this.checkSchedules();
    }, 20); // Check every second
    
    this.initialized = true;
    console.log(`§a[ScheduleManager] Loaded ${this.schedules.size} schedules`);
  }
  
  static checkSchedules() {
    const now = Date.now();
    
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && schedule.nextExecution && now >= schedule.nextExecution) {
        schedule.execute().catch(error => {
          console.error(`§c[ScheduleManager] Error executing schedule ${schedule.id}:`, error);
        });
      }
    }
  }
  
  static createSchedule(data) {
    const schedule = new Schedule(data);
    this.schedules.set(schedule.id, schedule);
    schedule.save();
    return schedule;
  }
  
  static getSchedule(id) {
    return this.schedules.get(id);
  }
  
  static getPlayerSchedules(playerName) {
    return Array.from(this.schedules.values())
      .filter(s => s.creator === playerName);
  }
  
  static getAllSchedules() {
    return Array.from(this.schedules.values());
  }
  
  static deleteSchedule(id) {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.delete();
      this.schedules.delete(id);
      return true;
    }
    return false;
  }
  
  static getPlayerScheduleCount(playerName) {
    return this.getPlayerSchedules(playerName).length;
  }
  
  static getPlayerLimit(player) {
    if (player.hasTag(CONFIG.permissions.bypass_limit)) {
      return -1; // Unlimited
    } else if (player.hasTag("vip")) {
      return CONFIG.limits.max_schedules_vip;
    } else {
      return CONFIG.limits.max_schedules_default;
    }
  }
}

// ================== UI MANAGER ==================
class UIManager {
  static async showMainMenu(player) {
    const scheduleCount = ScheduleManager.getPlayerScheduleCount(player.name);
    const limit = ScheduleManager.getPlayerLimit(player);
    const limitText = limit === -1 ? "∞" : limit;
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}§l📅 Schedule Manager`)
      .body(
        `${CONFIG.ui.info_color}Manage your scheduled commands\n\n` +
        `${CONFIG.ui.secondary_color}Your Schedules: ${CONFIG.ui.primary_color}${scheduleCount}/${limitText}\n` +
        `${CONFIG.ui.info_color}Create automated tasks that run on schedule`
      )
      .button(`${CONFIG.ui.success_color}➕ Create New Schedule`, "textures/ui/color_plus")
      .button(`${CONFIG.ui.primary_color}📋 My Schedules`, "textures/ui/copy")
      .button(`${CONFIG.ui.secondary_color}📚 Templates`, "textures/ui/book_edit_default")
      .button(`${CONFIG.ui.warning_color}📊 Execution History`, "textures/ui/graph");
    
    if (player.hasTag(CONFIG.permissions.admin)) {
      form.button(`${CONFIG.ui.error_color}👑 Admin Panel`, "textures/ui/op");
    }
    
    form.button(`${CONFIG.ui.info_color}❓ Help`, "textures/ui/help")
      .button(`${CONFIG.ui.error_color}✖ Close`, "textures/ui/cancel");
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    switch (response.selection) {
      case 0:
        this.showCreateSchedule(player);
        break;
      case 1:
        this.showMySchedules(player);
        break;
      case 2:
        this.showTemplates(player);
        break;
      case 3:
        this.showExecutionHistory(player);
        break;
      case 4:
        if (player.hasTag(CONFIG.permissions.admin)) {
          this.showAdminPanel(player);
        } else {
          this.showHelp(player);
        }
        break;
      case 5:
        player.hasTag(CONFIG.permissions.admin) ? this.showHelp(player) : null;
        break;
    }
  }
  
  static async showCreateSchedule(player) {
    // Check limit
    const count = ScheduleManager.getPlayerScheduleCount(player.name);
    const limit = ScheduleManager.getPlayerLimit(player);
    
    if (limit !== -1 && count >= limit) {
      player.sendMessage(`${CONFIG.ui.error_color}You have reached your schedule limit (${limit})`);
      this.showMainMenu(player);
      return;
    }
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}§lCreate Schedule`)
      .body(`${CONFIG.ui.info_color}Choose the type of schedule you want to create`);
    
    for (const type of Object.values(ScheduleType)) {
      form.button(`${type.icon} ${type.name}\n${CONFIG.ui.info_color}${type.description}`);
    }
    
    form.button(`${CONFIG.ui.error_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    const types = Object.values(ScheduleType);
    if (response.selection === types.length) {
      this.showMainMenu(player);
      return;
    }
    
    const selectedType = types[response.selection];
    this.showScheduleTypeForm(player, selectedType);
  }
  
  static async showScheduleTypeForm(player, type) {
    switch (type.id) {
      case "single":
        this.showSingleScheduleForm(player);
        break;
      case "recurring":
        this.showRecurringScheduleForm(player);
        break;
      case "daily":
        this.showDailyScheduleForm(player);
        break;
      case "weekly":
        this.showWeeklyScheduleForm(player);
        break;
      case "monthly":
        this.showMonthlyScheduleForm(player);
        break;
      case "cron":
        this.showCronScheduleForm(player);
        break;
    }
  }
  
  static async showSingleScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Single Execution Schedule`)
      .textField("Schedule Name", "My Single Task", "")
      .textField("Description (optional)", "Runs once at specified time", "")
      .textField("Date (YYYY-MM-DD)", "2024-12-25", "")
      .textField("Time (HH:MM)", "12:00", "")
      .textField("Commands (one per line)", "say Hello World!\ngive @a diamond 1", "");
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const [name, description, date, time, commandsText] = response.formValues;
    
    // Validate inputs
    if (!name || !date || !time || !commandsText) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields`);
      return;
    }
    
    // Parse date and time
    const timestamp = new Date(`${date} ${time}`).getTime();
    if (isNaN(timestamp) || timestamp <= Date.now()) {
      player.sendMessage(`${CONFIG.ui.error_color}Invalid date/time or time is in the past`);
      return;
    }
    
    // Parse commands
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    // Create schedule
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.SINGLE.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        timestamp: timestamp
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Will execute on ${TimeUtils.formatDate(timestamp)}`);
    
    this.showMainMenu(player);
  }
  
  static async showRecurringScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Recurring Schedule`)
      .textField("Schedule Name", "My Recurring Task", "")
      .textField("Description (optional)", "Repeats at regular intervals", "")
      .textField("Interval Value", "30", "")
      .dropdown("Interval Unit", ["Minutes", "Hours", "Days"], 0)
      .textField("Commands (one per line)", "say Server restart in 10 minutes\nsave-all", "")
      .toggle("Run as Operator", false)
      .toggle("Continue on Error", true);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const [name, description, intervalStr, unitIndex, commandsText, runAsOp, continueOnError] = response.formValues;
    const units = ["minute", "hour", "day"];
    const unit = units[unitIndex];
    const interval = parseInt(intervalStr);
    
    // Validate
    if (!name || !intervalStr || !commandsText || isNaN(interval) || interval < 1) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields correctly`);
      return;
    }
    
    // Check minimum interval
    const intervalMs = TimeUtils.parseInterval(interval, unit);
    if (intervalMs < CONFIG.limits.min_interval_seconds * 1000) {
      player.sendMessage(`${CONFIG.ui.error_color}Interval must be at least ${CONFIG.limits.min_interval_seconds} seconds`);
      return;
    }
    
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.RECURRING.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        interval: interval,
        unit: unit
      },
      options: {
        runAsOp: runAsOp,
        continueOnError: continueOnError
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Will run every ${interval} ${unit}(s)`);
    
    this.showMainMenu(player);
  }
  
  static async showDailyScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Daily Schedule`)
      .textField("Schedule Name", "Daily Backup", "")
      .textField("Description (optional)", "Runs every day at specified times", "")
      .textField("Times (HH:MM, comma separated)", "06:00, 12:00, 18:00, 00:00", "")
      .textField("Commands (one per line)", "say Starting daily backup...\nsave-all\nsay Backup completed!", "")
      .dropdown("Dimension", ["Overworld", "Nether", "End"], 0)
      .toggle("Notify on Success", true)
      .toggle("Notify on Failure", true);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const [name, description, timesText, commandsText, dimensionIndex, notifySuccess, notifyFailure] = response.formValues;
    const dimensions = ["overworld", "nether", "the_end"];
    
    if (!name || !timesText || !commandsText) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields`);
      return;
    }
    
    // Parse times
    const times = timesText.split(',').map(t => t.trim());
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    for (const time of times) {
      if (!timeRegex.test(time)) {
        player.sendMessage(`${CONFIG.ui.error_color}Invalid time format: ${time}. Use HH:MM`);
        return;
      }
    }
    
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.DAILY.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        times: times
      },
      options: {
        dimension: dimensions[dimensionIndex],
        notifyOnSuccess: notifySuccess,
        notifyOnFailure: notifyFailure
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Will run daily at: ${times.join(', ')}`);
    
    this.showMainMenu(player);
  }
  
  static async showWeeklyScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Weekly Schedule`)
      .textField("Schedule Name", "Weekly Maintenance", "")
      .textField("Description (optional)", "Runs on specific days each week", "")
      .toggle("Sunday", false)
      .toggle("Monday", true)
      .toggle("Tuesday", false)
      .toggle("Wednesday", false)
      .toggle("Thursday", false)
      .toggle("Friday", true)
      .toggle("Saturday", false)
      .textField("Time (HH:MM)", "03:00", "")
      .textField("Commands (one per line)", "say Weekly maintenance starting...\nkick @a Server maintenance\nstop", "");
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const values = response.formValues;
    const name = values[0];
    const description = values[1];
    const days = [];
    
    // Get selected days
    for (let i = 0; i < 7; i++) {
      if (values[i + 2]) days.push(i);
    }
    
    const time = values[9];
    const commandsText = values[10];
    
    if (!name || days.length === 0 || !time || !commandsText) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields and select at least one day`);
      return;
    }
    
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDays = days.map(d => dayNames[d]).join(', ');
    
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.WEEKLY.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        days: days,
        time: time
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Will run every ${selectedDays} at ${time}`);
    
    this.showMainMenu(player);
  }
  
  static async showMonthlyScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Monthly Schedule`)
      .textField("Schedule Name", "Monthly Report", "")
      .textField("Description (optional)", "Runs on specific days each month", "")
      .textField("Days of Month (comma separated, 1-31)", "1, 15, 30", "")
      .textField("Time (HH:MM)", "09:00", "")
      .textField("Commands (one per line)", "say Generating monthly report...\nexecute as @a run scoreboard players add @s monthly_login 1", "")
      .toggle("Retry on Failure", true)
      .slider("Max Retries", 1, 5, 1, 3);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const [name, description, daysText, time, commandsText, retryOnFailure, maxRetries] = response.formValues;
    
    if (!name || !daysText || !time || !commandsText) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields`);
      return;
    }
    
    // Parse days
    const days = daysText.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
    
    if (days.length === 0) {
      player.sendMessage(`${CONFIG.ui.error_color}Please specify valid days (1-31)`);
      return;
    }
    
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.MONTHLY.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        days: days,
        time: time
      },
      options: {
        retryOnFailure: retryOnFailure,
        maxRetries: maxRetries
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Will run on days ${days.join(', ')} at ${time} each month`);
    
    this.showMainMenu(player);
  }
  
  static async showCronScheduleForm(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Cron Schedule`)
      .textField("Schedule Name", "Advanced Schedule", "")
      .textField("Description (optional)", "Uses cron expression for complex scheduling", "")
      .textField("Cron Expression", "0 */6 * * *", "")
      .textField("Commands (one per line)", "say Cron job executing...", "")
      .toggle("Run as Operator", false);
    
    // Add cron help text
    form.textField("", "Cron Format: MIN HOUR DAY MONTH DOW\nExamples:\n0 0 * * * = Daily at midnight\n*/30 * * * * = Every 30 minutes\n0 6,18 * * * = 6 AM and 6 PM daily", "");
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showCreateSchedule(player);
      return;
    }
    
    const [name, description, cronExpression, commandsText, runAsOp] = response.formValues;
    
    if (!name || !cronExpression || !commandsText) {
      player.sendMessage(`${CONFIG.ui.error_color}Please fill all required fields`);
      return;
    }
    
    // Basic cron validation
    const cronParts = cronExpression.split(' ');
    if (cronParts.length !== 5) {
      player.sendMessage(`${CONFIG.ui.error_color}Invalid cron expression. Must have 5 parts: MIN HOUR DAY MONTH DOW`);
      return;
    }
    
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    const schedule = ScheduleManager.createSchedule({
      name: name.substring(0, CONFIG.limits.max_name_length),
      description: description.substring(0, CONFIG.limits.max_description_length),
      type: ScheduleType.CRON.id,
      creator: player.name,
      commands: commands,
      scheduleData: {
        expression: cronExpression
      },
      options: {
        runAsOp: runAsOp
      }
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created!`);
    player.sendMessage(`${CONFIG.ui.info_color}Cron expression: ${cronExpression}`);
    
    this.showMainMenu(player);
  }
  
  static async showMySchedules(player, page = 0) {
    const schedules = ScheduleManager.getPlayerSchedules(player.name);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(schedules.length / itemsPerPage);
    
    if (schedules.length === 0) {
      const form = new MessageFormData()
        .title(`${CONFIG.ui.primary_color}My Schedules`)
        .body(`${CONFIG.ui.info_color}You don't have any schedules yet.\n\nCreate your first schedule to get started!`)
        .button1("Create Schedule")
        .button2("Back");
      
      const response = await form.show(player);
      if (response.selection === 0) {
        this.showCreateSchedule(player);
      } else {
        this.showMainMenu(player);
      }
      return;
    }
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}§lMy Schedules (Page ${page + 1}/${totalPages})`)
      .body(`${CONFIG.ui.info_color}Select a schedule to manage`);
    
    // Add schedules for current page
    const startIndex = page * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, schedules.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const schedule = schedules[i];
      const typeInfo = Object.values(ScheduleType).find(t => t.id === schedule.type);
      const status = schedule.enabled ? `${CONFIG.ui.success_color}✓` : `${CONFIG.ui.error_color}✗`;
      const nextRun = schedule.nextExecution ? TimeUtils.formatDate(schedule.nextExecution) : "Never";
      
      form.button(
        `${status} ${typeInfo.icon} ${schedule.name}\n` +
        `${CONFIG.ui.info_color}Next: ${nextRun} | Runs: ${schedule.executionCount}`
      );
    }
    
    // Navigation buttons
    if (page > 0) {
      form.button(`${CONFIG.ui.info_color}◀ Previous Page`);
    }
    if (page < totalPages - 1) {
      form.button(`${CONFIG.ui.info_color}▶ Next Page`);
    }
    form.button(`${CONFIG.ui.error_color}↩ Back to Menu`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    const buttonIndex = response.selection;
    const scheduleButtons = endIndex - startIndex;
    
    if (buttonIndex < scheduleButtons) {
      // Schedule selected
      const selectedSchedule = schedules[startIndex + buttonIndex];
      this.showScheduleDetails(player, selectedSchedule);
    } else {
      // Navigation button
      let navIndex = buttonIndex - scheduleButtons;
      if (page > 0 && navIndex === 0) {
        // Previous page
        this.showMySchedules(player, page - 1);
      } else if (page < totalPages - 1 && navIndex === (page > 0 ? 1 : 0)) {
        // Next page
        this.showMySchedules(player, page + 1);
      } else {
        // Back to menu
        this.showMainMenu(player);
      }
    }
  }
  
  static async showScheduleDetails(player, schedule) {
    const typeInfo = Object.values(ScheduleType).find(t => t.id === schedule.type);
    const isOwner = schedule.creator === player.name;
    const isAdmin = player.hasTag(CONFIG.permissions.admin);
    
    let detailsText = `${CONFIG.ui.secondary_color}Type: ${CONFIG.ui.primary_color}${typeInfo.name}\n`;
    detailsText += `${CONFIG.ui.secondary_color}Status: ${schedule.enabled ? `${CONFIG.ui.success_color}Enabled` : `${CONFIG.ui.error_color}Disabled`}\n`;
    detailsText += `${CONFIG.ui.secondary_color}Created: ${CONFIG.ui.info_color}${TimeUtils.formatDate(schedule.createdAt)}\n`;
    detailsText += `${CONFIG.ui.secondary_color}Creator: ${CONFIG.ui.info_color}${schedule.creator}\n`;
    detailsText += `${CONFIG.ui.secondary_color}Executions: ${CONFIG.ui.info_color}${schedule.executionCount} (${schedule.failureCount} failed)\n`;
    
    if (schedule.lastExecution) {
      detailsText += `${CONFIG.ui.secondary_color}Last Run: ${CONFIG.ui.info_color}${TimeUtils.formatDate(schedule.lastExecution)}\n`;
    }
    
    if (schedule.nextExecution) {
      detailsText += `${CONFIG.ui.secondary_color}Next Run: ${CONFIG.ui.warning_color}${TimeUtils.formatDate(schedule.nextExecution)}\n`;
    }
    
    detailsText += `\n${CONFIG.ui.secondary_color}Commands:\n`;
    schedule.commands.forEach((cmd, i) => {
      detailsText += `${CONFIG.ui.info_color}${i + 1}. ${cmd}\n`;
    });
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}§l${schedule.name}`)
      .body(detailsText);
    
    if (isOwner || isAdmin) {
      form.button(schedule.enabled ? `${CONFIG.ui.error_color}⏸ Disable` : `${CONFIG.ui.success_color}▶ Enable`);
      form.button(`${CONFIG.ui.warning_color}⚡ Run Now`);
      form.button(`${CONFIG.ui.primary_color}✏ Edit`);
      form.button(`${CONFIG.ui.secondary_color}📋 Duplicate`);
      form.button(`${CONFIG.ui.error_color}🗑 Delete`);
    }
    
    form.button(`${CONFIG.ui.info_color}📊 View History`);
    form.button(`${CONFIG.ui.info_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    if (isOwner || isAdmin) {
      switch (response.selection) {
        case 0: // Toggle Enable
          schedule.enabled = !schedule.enabled;
          if (schedule.enabled) {
            schedule.calculateNextExecution();
          }
          schedule.save();
          player.sendMessage(`${CONFIG.ui.success_color}Schedule ${schedule.enabled ? 'enabled' : 'disabled'}`);
          this.showScheduleDetails(player, schedule);
          break;
          
        case 1: // Run Now
          player.sendMessage(`${CONFIG.ui.info_color}Executing schedule...`);
          const result = await schedule.execute();
          if (result.success) {
            player.sendMessage(`${CONFIG.ui.success_color}Schedule executed successfully!`);
          } else {
            player.sendMessage(`${CONFIG.ui.error_color}Execution failed: ${result.error}`);
          }
          this.showScheduleDetails(player, schedule);
          break;
          
        case 2: // Edit
          this.showEditSchedule(player, schedule);
          break;
          
        case 3: // Duplicate
          this.duplicateSchedule(player, schedule);
          break;
          
        case 4: // Delete
          this.confirmDeleteSchedule(player, schedule);
          break;
          
        case 5: // View History
          this.showScheduleHistory(player, schedule);
          break;
          
        case 6: // Back
          this.showMySchedules(player);
          break;
      }
    } else {
      if (response.selection === 0) {
        this.showScheduleHistory(player, schedule);
      } else {
        this.showMySchedules(player);
      }
    }
  }
  
  static async showEditSchedule(player, schedule) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Edit Schedule`)
      .textField("Schedule Name", schedule.name, schedule.name)
      .textField("Description", schedule.description || "", schedule.description)
      .textField("Commands (one per line)", "", schedule.commands.join('\n'))
      .toggle("Enabled", schedule.enabled)
      .toggle("Notify on Success", schedule.options.notifyOnSuccess)
      .toggle("Notify on Failure", schedule.options.notifyOnFailure);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showScheduleDetails(player, schedule);
      return;
    }
    
    const [name, description, commandsText, enabled, notifySuccess, notifyFailure] = response.formValues;
    const commands = commandsText.split('\n').filter(cmd => cmd.trim());
    
    if (!name || commands.length === 0) {
      player.sendMessage(`${CONFIG.ui.error_color}Name and commands are required`);
      return;
    }
    
    // Update schedule
    schedule.name = name.substring(0, CONFIG.limits.max_name_length);
    schedule.description = description.substring(0, CONFIG.limits.max_description_length);
    schedule.commands = commands.slice(0, CONFIG.limits.max_commands_per_schedule);
    schedule.enabled = enabled;
    schedule.options.notifyOnSuccess = notifySuccess;
    schedule.options.notifyOnFailure = notifyFailure;
    schedule.updatedAt = Date.now();
    
    if (enabled) {
      schedule.calculateNextExecution();
    }
    
    schedule.save();
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule updated successfully!`);
    this.showScheduleDetails(player, schedule);
  }
  
  static async duplicateSchedule(player, schedule) {
    const newSchedule = ScheduleManager.createSchedule({
      ...schedule.toJSON(),
      id: undefined,
      name: `${schedule.name} (Copy)`,
      creator: player.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
      failureCount: 0,
      lastExecution: null,
      enabled: false
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule duplicated as "${newSchedule.name}"`);
    this.showScheduleDetails(player, newSchedule);
  }
  
  static async confirmDeleteSchedule(player, schedule) {
    const form = new MessageFormData()
      .title(`${CONFIG.ui.error_color}Delete Schedule`)
      .body(
        `${CONFIG.ui.warning_color}Continue?`
      )
      .button1("Cleanup")
      .button2("Cancel");
    
    const response = await form.show(player);
    if (response.selection === 0) {
      const cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      let removedExecutions = 0;
      let removedSchedules = 0;
      
      // Clean old executions
      for (const [id, execution] of db.executions.entries()) {
        if (execution.startTime < cutoffDate) {
          db.executions.delete(id);
          removedExecutions++;
        }
      }
      
      // Clean inactive schedules
      for (const schedule of ScheduleManager.getAllSchedules()) {
        if (!schedule.enabled && 
            schedule.executionCount === 0 && 
            schedule.createdAt < cutoffDate) {
          ScheduleManager.deleteSchedule(schedule.id);
          removedSchedules++;
        }
      }
      
      player.sendMessage(`${CONFIG.ui.success_color}Cleanup completed!`);
      player.sendMessage(`${CONFIG.ui.info_color}Removed ${removedExecutions} old executions and ${removedSchedules} inactive schedules.`);
    }
    
    this.showAdminPanel(player);
  }
  
  static async showPlayerManagement(player) {
    const playerStats = new Map();
    
    // Collect stats for each player
    for (const schedule of ScheduleManager.getAllSchedules()) {
      if (!playerStats.has(schedule.creator)) {
        playerStats.set(schedule.creator, {
          schedules: 0,
          enabled: 0,
          executions: 0
        });
      }
      
      const stats = playerStats.get(schedule.creator);
      stats.schedules++;
      if (schedule.enabled) stats.enabled++;
      stats.executions += schedule.executionCount;
    }
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.warning_color}§l👥 Player Management`)
      .body(`${CONFIG.ui.info_color}Select a player to manage their schedules`);
    
    for (const [playerName, stats] of playerStats.entries()) {
      form.button(
        `${CONFIG.ui.primary_color}${playerName}\n` +
        `${CONFIG.ui.info_color}${stats.schedules} schedules (${stats.enabled} active)`
      );
    }
    
    form.button(`${CONFIG.ui.error_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    const players = Array.from(playerStats.keys());
    if (response.selection === players.length) {
      this.showAdminPanel(player);
    } else {
      const selectedPlayer = players[response.selection];
      this.showPlayerSchedulesAdmin(player, selectedPlayer);
    }
  }
  
  static async showPlayerSchedulesAdmin(admin, playerName) {
    const schedules = ScheduleManager.getPlayerSchedules(playerName);
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.warning_color}Schedules: ${playerName}`)
      .body(`${CONFIG.ui.info_color}Managing ${schedules.length} schedules`);
    
    schedules.forEach(schedule => {
      const status = schedule.enabled ? `${CONFIG.ui.success_color}✓` : `${CONFIG.ui.error_color}✗`;
      form.button(`${status} ${schedule.name}\n${CONFIG.ui.info_color}Runs: ${schedule.executionCount}`);
    });
    
    form.button(`${CONFIG.ui.warning_color}⏸ Disable All`)
      .button(`${CONFIG.ui.error_color}🗑 Delete All`)
      .button(`${CONFIG.ui.info_color}↩ Back`);
    
    const response = await form.show(admin);
    if (response.canceled) return;
    
    if (response.selection < schedules.length) {
      this.showScheduleDetails(admin, schedules[response.selection]);
    } else if (response.selection === schedules.length) {
      // Disable all
      schedules.forEach(s => {
        s.enabled = false;
        s.save();
      });
      admin.sendMessage(`${CONFIG.ui.success_color}Disabled all schedules for ${playerName}`);
      this.showPlayerManagement(admin);
    } else if (response.selection === schedules.length + 1) {
      // Delete all
      const confirmForm = new MessageFormData()
        .title(`${CONFIG.ui.error_color}Confirm Delete`)
        .body(`${CONFIG.ui.warning_color}Delete all ${schedules.length} schedules for ${playerName}?`)
        .button1("Delete")
        .button2("Cancel");
      
      const confirm = await confirmForm.show(admin);
      if (confirm.selection === 0) {
        schedules.forEach(s => ScheduleManager.deleteSchedule(s.id));
        admin.sendMessage(`${CONFIG.ui.success_color}Deleted all schedules for ${playerName}`);
      }
      this.showPlayerManagement(admin);
    } else {
      this.showPlayerManagement(admin);
    }
  }
  
  static async showSystemSettings(player) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.secondary_color}🔧 System Settings`)
      .textField("Default Schedule Limit", "", CONFIG.limits.max_schedules_default.toString())
      .textField("VIP Schedule Limit", "", CONFIG.limits.max_schedules_vip.toString())
      .textField("Minimum Interval (seconds)", "", (CONFIG.limits.min_interval_seconds).toString())
      .textField("Max Commands per Schedule", "", CONFIG.limits.max_commands_per_schedule.toString())
      .toggle("Enable Debug Logging", false);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showAdminPanel(player);
      return;
    }
    
    const [defaultLimit, vipLimit, minInterval, maxCommands, debug] = response.formValues;
    
    // Update config (in a real implementation, save to persistent storage)
    CONFIG.limits.max_schedules_default = parseInt(defaultLimit) || 5;
    CONFIG.limits.max_schedules_vip = parseInt(vipLimit) || 15;
    CONFIG.limits.min_interval_seconds = parseInt(minInterval) || 60;
    CONFIG.limits.max_commands_per_schedule = parseInt(maxCommands) || 10;
    
    player.sendMessage(`${CONFIG.ui.success_color}Settings updated!`);
    this.showAdminPanel(player);
  }
}

// ================== COMMAND REGISTRATION ==================
if (bridge && bridge.bedrockCommands) {
  // Main command
  bridge.bedrockCommands.registerCommand(
    "schedule",
    "Open the schedule manager",
    (player) => {
      UIManager.showMainMenu(player);
    }
  );
  
  // Quick commands
  bridge.bedrockCommands.registerCommand(
    "schedules",
    "View your schedules",
    (player) => {
      UIManager.showMySchedules(player);
    }
  );
  
  // Admin command
  bridge.bedrockCommands.registerAdminCommand(
    "schedule-admin",
    "Open schedule admin panel",
    (player) => {
      UIManager.showAdminPanel(player);
    }
  );
}

// ================== EVENT HANDLERS ==================
world.afterEvents.playerJoin.subscribe((event) => {
  const player = event.player;
  const scheduleCount = ScheduleManager.getPlayerScheduleCount(player.name);
  
  if (scheduleCount > 0) {
    system.runTimeout(() => {
      player.sendMessage(`${CONFIG.ui.info_color}[Schedule Manager] You have ${scheduleCount} active schedule(s). Use /schedule to manage them.`);
    }, 100); // 5 seconds delay
  }
});

// ================== INITIALIZATION ==================
system.runTimeout(async () => {
  await ScheduleManager.initialize();
  console.log(`${CONFIG.ui.success_color}[Schedule Manager] Version ${CONFIG.plugin.version} initialized successfully!`);
  console.log(`${CONFIG.ui.info_color}[Schedule Manager] Use /schedule to open the manager`);
}, 1);

// ================== EXPORTS ==================
export { ScheduleManager, Schedule, UIManager };Are you sure you want to delete this schedule?\n\n` +
        `${CONFIG.ui.error_color}Schedule: ${schedule.name}\n` +
        `${CONFIG.ui.info_color}This action cannot be undone!`
      )
      .button1("Delete")
      .button2("Cancel");
    
    const response = await form.show(player);
    if (response.selection === 0) {
      ScheduleManager.deleteSchedule(schedule.id);
      player.sendMessage(`${CONFIG.ui.success_color}Schedule deleted`);
      this.showMySchedules(player);
    } else {
      this.showScheduleDetails(player, schedule);
    }
  }
  
  static async showScheduleHistory(player, schedule) {
    const executions = Array.from(db.executions.values())
      .filter(e => e.scheduleId === schedule.id)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);
    
    let historyText = `${CONFIG.ui.info_color}Last 10 executions:\n\n`;
    
    if (executions.length === 0) {
      historyText += `${CONFIG.ui.warning_color}No execution history yet`;
    } else {
      executions.forEach(exec => {
        const time = TimeUtils.formatDate(exec.startTime);
        const duration = exec.endTime ? `${exec.endTime - exec.startTime}ms` : "N/A";
        const status = exec.success ? `${CONFIG.ui.success_color}✓` : `${CONFIG.ui.error_color}✗`;
        
        historyText += `${status} ${time} (${duration})\n`;
        if (!exec.success && exec.error) {
          historyText += `  ${CONFIG.ui.error_color}Error: ${exec.error}\n`;
        }
      });
    }
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}Execution History`)
      .body(historyText)
      .button(`${CONFIG.ui.info_color}↩ Back`);
    
    const response = await form.show(player);
    this.showScheduleDetails(player, schedule);
  }
  
  static async showTemplates(player) {
    const templates = [
      {
        name: "Hourly Backup",
        description: "Saves the world every hour",
        type: ScheduleType.RECURRING.id,
        commands: ["say §e[Backup] Starting hourly backup...", "save-all", "say §a[Backup] Backup completed!"],
        scheduleData: { interval: 1, unit: "hour" }
      },
      {
        name: "Daily Restart Warning",
        description: "Warns players about daily restart",
        type: ScheduleType.DAILY.id,
        commands: [
          "say §c[System] Server will restart in 10 minutes!",
          "say §c[System] Please finish what you're doing and prepare for restart."
        ],
        scheduleData: { times: ["03:50", "11:50", "19:50"] }
      },
      {
        name: "Weekly Maintenance",
        description: "Performs weekly server maintenance",
        type: ScheduleType.WEEKLY.id,
        commands: [
          "say §6[Maintenance] Starting weekly maintenance...",
          "save-all",
          "say §6[Maintenance] Clearing dropped items...",
          "kill @e[type=item]",
          "say §a[Maintenance] Maintenance completed!"
        ],
        scheduleData: { days: [0], time: "04:00" }
      },
      {
        name: "Player Activity Reward",
        description: "Rewards online players every 30 minutes",
        type: ScheduleType.RECURRING.id,
        commands: [
          "execute as @a run scoreboard players add @s playtime 30",
          "give @a[scores={playtime=60..}] diamond 1",
          "execute as @a[scores={playtime=60..}] run scoreboard players remove @s playtime 60",
          "execute as @a[scores={playtime=60..}] run say §a[Reward] You received a diamond for playing!"
        ],
        scheduleData: { interval: 30, unit: "minute" }
      }
    ];
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}§lSchedule Templates`)
      .body(`${CONFIG.ui.info_color}Quick-start templates for common tasks`);
    
    templates.forEach(template => {
      const typeInfo = Object.values(ScheduleType).find(t => t.id === template.type);
      form.button(`${typeInfo.icon} ${template.name}\n${CONFIG.ui.info_color}${template.description}`);
    });
    
    form.button(`${CONFIG.ui.error_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    if (response.selection === templates.length) {
      this.showMainMenu(player);
      return;
    }
    
    const template = templates[response.selection];
    this.createFromTemplate(player, template);
  }
  
  static async createFromTemplate(player, template) {
    const form = new ModalFormData()
      .title(`${CONFIG.ui.primary_color}Create from Template`)
      .textField("Schedule Name", template.name, template.name)
      .toggle("Enable immediately", true);
    
    const response = await form.show(player);
    if (response.canceled) {
      this.showTemplates(player);
      return;
    }
    
    const [name, enableNow] = response.formValues;
    
    const schedule = ScheduleManager.createSchedule({
      name: name,
      description: template.description,
      type: template.type,
      creator: player.name,
      commands: template.commands,
      scheduleData: template.scheduleData,
      enabled: enableNow
    });
    
    player.sendMessage(`${CONFIG.ui.success_color}Schedule "${schedule.name}" created from template!`);
    this.showScheduleDetails(player, schedule);
  }
  
  static async showExecutionHistory(player) {
    const playerSchedules = ScheduleManager.getPlayerSchedules(player.name);
    const scheduleIds = playerSchedules.map(s => s.id);
    
    const executions = Array.from(db.executions.values())
      .filter(e => scheduleIds.includes(e.scheduleId))
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 20);
    
    let historyText = `${CONFIG.ui.info_color}Your recent executions:\n\n`;
    
    if (executions.length === 0) {
      historyText += `${CONFIG.ui.warning_color}No execution history yet`;
    } else {
      executions.forEach(exec => {
        const schedule = ScheduleManager.getSchedule(exec.scheduleId);
        const time = TimeUtils.formatDate(exec.startTime);
        const status = exec.success ? `${CONFIG.ui.success_color}✓` : `${CONFIG.ui.error_color}✗`;
        
        historyText += `${status} ${schedule?.name || 'Unknown'} - ${time}\n`;
      });
    }
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}Execution History`)
      .body(historyText)
      .button(`${CONFIG.ui.info_color}↩ Back`);
    
    await form.show(player);
    this.showMainMenu(player);
  }
  
  static async showAdminPanel(player) {
    const allSchedules = ScheduleManager.getAllSchedules();
    const enabledCount = allSchedules.filter(s => s.enabled).length;
    const totalExecutions = allSchedules.reduce((sum, s) => sum + s.executionCount, 0);
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.error_color}§l👑 Admin Panel`)
      .body(
        `${CONFIG.ui.secondary_color}System Overview:\n` +
        `${CONFIG.ui.info_color}Total Schedules: ${CONFIG.ui.primary_color}${allSchedules.length}\n` +
        `${CONFIG.ui.info_color}Enabled: ${CONFIG.ui.success_color}${enabledCount}\n` +
        `${CONFIG.ui.info_color}Total Executions: ${CONFIG.ui.primary_color}${totalExecutions}\n`
      )
      .button(`${CONFIG.ui.primary_color}📋 All Schedules`)
      .button(`${CONFIG.ui.warning_color}👥 Manage Players`)
      .button(`${CONFIG.ui.secondary_color}🔧 System Settings`)
      .button(`${CONFIG.ui.error_color}🗑 Cleanup Old Data`)
      .button(`${CONFIG.ui.info_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    switch (response.selection) {
      case 0:
        this.showAllSchedules(player);
        break;
      case 1:
        this.showPlayerManagement(player);
        break;
      case 2:
        this.showSystemSettings(player);
        break;
      case 3:
        this.cleanupOldData(player);
        break;
      case 4:
        this.showMainMenu(player);
        break;
    }
  }
  
  static async showAllSchedules(player, page = 0) {
    const allSchedules = ScheduleManager.getAllSchedules();
    const itemsPerPage = 10;
    const totalPages = Math.ceil(allSchedules.length / itemsPerPage);
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.primary_color}All Schedules (Page ${page + 1}/${totalPages})`)
      .body(`${CONFIG.ui.info_color}Total: ${allSchedules.length} schedules`);
    
    const startIndex = page * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allSchedules.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const schedule = allSchedules[i];
      const status = schedule.enabled ? `${CONFIG.ui.success_color}✓` : `${CONFIG.ui.error_color}✗`;
      form.button(`${status} ${schedule.name}\n${CONFIG.ui.info_color}by ${schedule.creator}`);
    }
    
    if (page > 0) form.button(`${CONFIG.ui.info_color}◀ Previous`);
    if (page < totalPages - 1) form.button(`${CONFIG.ui.info_color}▶ Next`);
    form.button(`${CONFIG.ui.error_color}↩ Back`);
    
    const response = await form.show(player);
    if (response.canceled) return;
    
    const buttonIndex = response.selection;
    const scheduleButtons = endIndex - startIndex;
    
    if (buttonIndex < scheduleButtons) {
      const selectedSchedule = allSchedules[startIndex + buttonIndex];
      this.showScheduleDetails(player, selectedSchedule);
    } else {
      let navIndex = buttonIndex - scheduleButtons;
      if (page > 0 && navIndex === 0) {
        this.showAllSchedules(player, page - 1);
      } else if (page < totalPages - 1 && navIndex === (page > 0 ? 1 : 0)) {
        this.showAllSchedules(player, page + 1);
      } else {
        this.showAdminPanel(player);
      }
    }
  }
  
  static async showHelp(player) {
    const helpText = `${CONFIG.ui.primary_color}§lSchedule Manager Help\n\n` +
      `${CONFIG.ui.secondary_color}Schedule Types:\n` +
      `${CONFIG.ui.info_color}• Single: Runs once at a specific time\n` +
      `• Recurring: Repeats at regular intervals\n` +
      `• Daily: Runs every day at specified times\n` +
      `• Weekly: Runs on specific days of the week\n` +
      `• Monthly: Runs on specific days of the month\n` +
      `• Cron: Advanced scheduling with cron syntax\n\n` +
      `${CONFIG.ui.secondary_color}Variables:\n` +
      `${CONFIG.ui.info_color}Use these in your commands:\n` +
      `• {player_count} - Online player count\n` +
      `• {time} - Current time\n` +
      `• {date} - Current date\n` +
      `• {schedule_name} - Schedule name\n` +
      `• {execution_count} - Execution number\n` +
      `• {random} - Random number 0-99\n\n` +
      `${CONFIG.ui.secondary_color}Tips:\n` +
      `${CONFIG.ui.info_color}• Schedules run even when you're offline\n` +
      `• Use templates for quick setup\n` +
      `• Enable notifications to track executions\n` +
      `• Admin tag required for admin features`;
    
    const form = new ActionFormData()
      .title(`${CONFIG.ui.info_color}❓ Help`)
      .body(helpText)
      .button(`${CONFIG.ui.info_color}↩ Back`);
    
    await form.show(player);
    this.showMainMenu(player);
  }
  
  static async cleanupOldData(player) {
    const form = new MessageFormData()
      .title(`${CONFIG.ui.warning_color}Cleanup Old Data`)
      .body(
        `${CONFIG.ui.info_color}This will remove:\n` +
        `• Execution logs older than 7 days\n` +
        `• Disabled schedules with no recent activity\n\n` +
        `${CONFIG.ui.warning_color