// RSS-Bridge Plugin v2.0.0
// Comprehensive RSS Feed Integration for BedrockBridge
// Features: Feed parsing, automatic updates, Discord integration, database persistence
// Author: TheFelixLive / BedrockBridge Integration
// Build: B001

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { HttpRequest, http, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

// ================= VERSION & METADATA =================
const VERSION_INFO = {
  name: "RSS-Bridge",
  version: "v2.0.0",
  build: "B001",
  release_type: 0, // 0 = Development (debug), 1 = Beta, 2 = Stable
  unix: Date.now(),
  uuid: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  description: "Advanced RSS Feed Integration with BedrockBridge Support"
};

// ================= BRIDGE API IMPORTS =================
let bridge, bridgeDirect, database;
let bridgeAvailable = false;

try {
  const bridgeModule = await import("esploratori/bridgeAPI");
  bridge = bridgeModule.bridge;
  bridgeDirect = bridgeModule.bridgeDirect;
  database = bridgeModule.database;
  bridgeAvailable = true;
  console.warn(`[${VERSION_INFO.name}] BedrockBridge API loaded successfully`);
} catch (error) {
  console.warn(`[${VERSION_INFO.name}] BedrockBridge API not available - running in standalone mode`);

  // Mock database for standalone mode
  database = {
    makeTable: (name) => {
      const data = new Map();
      return {
        get: (key) => data.get(key),
        set: (key, value) => data.set(key, value),
        has: (key) => data.has(key),
        delete: (key) => data.delete(key),
        entries: () => Array.from(data.entries()),
        clear: () => data.clear(),
        size: () => data.size
      };
    }
  };
}

// ================= DATABASE TABLES =================
const feedsTable = database.makeTable("rss_feeds");
const categoriesTable = database.makeTable("rss_categories");
const settingsTable = database.makeTable("rss_settings");
const updateHistoryTable = database.makeTable("rss_update_history");

// ================= RSS PARSER CLASS =================
class RSSParser {
  constructor() {
    this.cacheTimeout = 300000; // 5 minutes
    this.cache = new Map();
  }

  /**
   * Parse RSS XML content to JSON
   * @param {string} xmlContent - Raw XML content
   * @returns {Object} Parsed feed object
   */
  parseXML(xmlContent) {
    try {
      const feed = {
        title: "",
        description: "",
        link: "",
        language: "",
        lastBuildDate: "",
        items: []
      };

      // Extract title
      const titleMatch = xmlContent.match(/<title[^>]*>([^<]+)<\/title>/);
      if (titleMatch) feed.title = this.decodeHTML(titleMatch[1]);

      // Extract description
      const descMatch = xmlContent.match(/<description[^>]*>([^<]+)<\/description>/);
      if (descMatch) feed.description = this.decodeHTML(descMatch[1]);

      // Extract link
      const linkMatch = xmlContent.match(/<link[^>]*>([^<]+)<\/link>/);
      if (linkMatch) feed.link = linkMatch[1];

      // Extract language
      const langMatch = xmlContent.match(/<language[^>]*>([^<]+)<\/language>/);
      if (langMatch) feed.language = langMatch[1];

      // Extract items
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
      let itemMatch;

      while ((itemMatch = itemRegex.exec(xmlContent)) !== null) {
        const itemContent = itemMatch[1];
        const item = {
          title: "",
          description: "",
          link: "",
          pubDate: "",
          author: "",
          category: "",
          guid: ""
        };

        const itemTitleMatch = itemContent.match(/<title[^>]*>([^<]+)<\/title>/);
        if (itemTitleMatch) item.title = this.decodeHTML(itemTitleMatch[1]);

        const itemDescMatch = itemContent.match(/<description[^>]*>([^<]+)<\/description>/);
        if (itemDescMatch) item.description = this.decodeHTML(itemDescMatch[1]).substring(0, 256);

        const itemLinkMatch = itemContent.match(/<link[^>]*>([^<]+)<\/link>/);
        if (itemLinkMatch) item.link = itemLinkMatch[1];

        const pubDateMatch = itemContent.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/);
        if (pubDateMatch) item.pubDate = pubDateMatch[1];

        const authorMatch = itemContent.match(/<author[^>]*>([^<]+)<\/author>/);
        if (authorMatch) item.author = this.decodeHTML(authorMatch[1]);

        const categoryMatch = itemContent.match(/<category[^>]*>([^<]+)<\/category>/);
        if (categoryMatch) item.category = categoryMatch[1];

        const guidMatch = itemContent.match(/<guid[^>]*>([^<]+)<\/guid>/);
        if (guidMatch) item.guid = guidMatch[1];

        feed.items.push(item);
      }

      return feed;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] XML Parse Error:`, error);
      return null;
    }
  }

  /**
   * Decode HTML entities
   */
  decodeHTML(text) {
    const entities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&#39;": "'",
      "&nbsp;": " "
    };
    return text.replace(/&[a-zA-Z0-9]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Format date for display
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      return this.formatDate(dateStr);
    } catch {
      return dateStr;
    }
  }
}

// ================= FEED MANAGER CLASS =================
class FeedManager {
  constructor() {
    this.parser = new RSSParser();
    this.updateInterval = 600000; // 10 minutes
    this.maxRetries = 3;
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Fetch and parse RSS feed
   */
  async fetchFeed(feedUrl, playerId = null) {
    try {
      // Check cache
      if (this.parser.cache.has(feedUrl)) {
        const cached = this.parser.cache.get(feedUrl);
        if (Date.now() - cached.timestamp < this.parser.cacheTimeout) {
          return cached.data;
        }
      }

      const request = new HttpRequest(feedUrl, {
        method: HttpRequestMethod.Get,
        timeout: this.requestTimeout,
        headers: new HttpHeader({
          "User-Agent": `${VERSION_INFO.name}/${VERSION_INFO.version}`
        })
      });

      const response = await http.request(request);
      const xmlContent = response.body;

      if (!xmlContent) {
        throw new Error("Empty response body");
      }

      const parsedFeed = this.parser.parseXML(xmlContent);

      // Cache result
      this.parser.cache.set(feedUrl, {
        data: parsedFeed,
        timestamp: Date.now()
      });

      return parsedFeed;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Feed fetch error for ${feedUrl}:`, error);
      return null;
    }
  }

  /**
   * Add feed to database
   */
  addFeed(feedUrl, category = "General", playerId = null) {
    try {
      const feedId = this.generateFeedId();
      const feedData = {
        id: feedId,
        url: feedUrl,
        category: category,
        addedBy: playerId || "server",
        addedAt: Date.now(),
        lastUpdate: 0,
        enabled: true,
        notifyPlayers: [],
        checkInterval: this.updateInterval
      };

      feedsTable.set(feedId, feedData);

      // Add to category
      const categoryData = categoriesTable.get(category) || { feeds: [], createdAt: Date.now() };
      if (!categoryData.feeds.includes(feedId)) {
        categoryData.feeds.push(feedId);
        categoriesTable.set(category, categoryData);
      }

      console.warn(`[${VERSION_INFO.name}] Feed added: ${feedId}`);
      return feedId;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Error adding feed:`, error);
      return null;
    }
  }

  /**
   * Remove feed from database
   */
  removeFeed(feedId) {
    try {
      const feed = feedsTable.get(feedId);
      if (feed) {
        feedsTable.delete(feedId);

        // Remove from category
        const categoryData = categoriesTable.get(feed.category);
        if (categoryData) {
          categoryData.feeds = categoryData.feeds.filter(id => id !== feedId);
          if (categoryData.feeds.length === 0) {
            categoriesTable.delete(feed.category);
          } else {
            categoriesTable.set(feed.category, categoryData);
          }
        }

        console.warn(`[${VERSION_INFO.name}] Feed removed: ${feedId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Error removing feed:`, error);
      return false;
    }
  }

  /**
   * Get all feeds
   */
  getAllFeeds() {
    const feeds = [];
    for (const [key, value] of feedsTable.entries()) {
      feeds.push(value);
    }
    return feeds;
  }

  /**
   * Get feeds by category
   */
  getFeedsByCategory(category) {
    const categoryData = categoriesTable.get(category);
    if (!categoryData) return [];

    const feeds = [];
    for (const feedId of categoryData.feeds) {
      const feed = feedsTable.get(feedId);
      if (feed) feeds.push(feed);
    }
    return feeds;
  }

  /**
   * Generate unique feed ID
   */
  generateFeedId() {
    return `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe player to feed notifications
   */
  subscribeFeed(feedId, playerId) {
    const feed = feedsTable.get(feedId);
    if (feed && !feed.notifyPlayers.includes(playerId)) {
      feed.notifyPlayers.push(playerId);
      feedsTable.set(feedId, feed);
      return true;
    }
    return false;
  }

  /**
   * Unsubscribe player from feed notifications
   */
  unsubscribeFeed(feedId, playerId) {
    const feed = feedsTable.get(feedId);
    if (feed) {
      feed.notifyPlayers = feed.notifyPlayers.filter(id => id !== playerId);
      feedsTable.set(feedId, feed);
      return true;
    }
    return false;
  }
}

// ================= DISCORD INTEGRATION CLASS =================
class DiscordIntegration {
  constructor() {
    this.ready = bridgeAvailable && bridgeDirect && bridgeDirect.ready;
  }

  /**
   * Send RSS update to Discord
   */
  async sendFeedUpdate(feed, items, count = 5) {
    if (!this.ready) return false;

    try {
      const itemsText = items.slice(0, count).map((item, idx) => {
        return `**${idx + 1}. ${item.title}**\n${item.description || "No description"}\n*${new FeedManager().parser.getRelativeTime(item.pubDate)}*`;
      }).join("\n\n");

      const embed = {
        title: `📰 RSS Update: ${feed.title}`,
        description: itemsText,
        url: feed.link,
        color: 3447003,
        timestamp: new Date().toISOString(),
        footer: {
          text: `${VERSION_INFO.name} v${VERSION_INFO.version}`
        }
      };

      bridgeDirect.sendEmbed(embed, feed.title || "RSS Feed", "https://www.w3schools.com/xml/note.jpg");
      return true;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Discord send error:`, error);
      return false;
    }
  }

  /**
   * Send notification message to Discord
   */
  sendNotification(title, message, type = "info") {
    if (!this.ready) return false;

    try {
      const colors = {
        info: 3447003,
        success: 3066993,
        warning: 16776960,
        error: 15158332
      };

      const embed = {
        title: `[${type.toUpperCase()}] ${title}`,
        description: message,
        color: colors[type] || colors.info,
        timestamp: new Date().toISOString()
      };

      bridgeDirect.sendEmbed(embed, VERSION_INFO.name, "");
      return true;
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Notification send error:`, error);
      return false;
    }
  }
}

// ================= UI MANAGER CLASS =================
class UIManager {
  constructor(feedManager, discordIntegration) {
    this.feedManager = feedManager;
    this.discord = discordIntegration;
  }

  /**
   * Main menu
   */
  async mainMenu(player) {
    const form = new ActionFormData();
    form.title(`§l§6${VERSION_INFO.name}§r`);
    form.body(`Welcome to ${VERSION_INFO.name} v${VERSION_INFO.version}!\n\n§l§7Available Options:§r`);
    form.button("📰 Browse Feeds");
    form.button("➕ Add Feed");
    form.button("⚙️ Settings");
    form.button("❓ About");

    try {
      const response = await form.show(player);
      if (response.canceled) return;

      switch (response.selection) {
        case 0: return await this.browseFeedsMenu(player);
        case 1: return await this.addFeedMenu(player);
        case 2: return await this.settingsMenu(player);
        case 3: return await this.aboutMenu(player);
      }
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Menu error:`, error);
    }
  }

  /**
   * Browse feeds menu
   */
  async browseFeedsMenu(player) {
    const feeds = this.feedManager.getAllFeeds();

    if (feeds.length === 0) {
      const form = new MessageFormData();
      form.title("No Feeds");
      form.body("No RSS feeds are currently loaded. Add a new feed to get started!");
      form.button1("Add Feed");
      form.button2("Back");

      const response = await form.show(player);
      if (response.selection === 0) return await this.addFeedMenu(player);
      else return await this.mainMenu(player);
    }

    const form = new ActionFormData();
    form.title("Browse Feeds");
    form.body(`Total Feeds: §l${feeds.length}§r\n\nSelect a feed to view:`);

    for (const feed of feeds) {
      const status = feed.enabled ? "✓" : "✗";
      form.button(`${status} ${feed.category}\n${feed.url.substring(0, 30)}...`);
    }
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled || response.selection === feeds.length) {
        return await this.mainMenu(player);
      }

      const selectedFeed = feeds[response.selection];
      return await this.viewFeedMenu(player, selectedFeed);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Browse menu error:`, error);
    }
  }

  /**
   * View individual feed
   */
  async viewFeedMenu(player, feed) {
    const feedData = await this.feedManager.fetchFeed(feed.url, player.id);

    if (!feedData) {
      const form = new MessageFormData();
      form.title("Feed Error");
      form.body("Failed to fetch feed. Please check the URL and try again.");
      form.button1("Retry");
      form.button2("Back");

      const response = await form.show(player);
      if (response.selection === 0) return await this.viewFeedMenu(player, feed);
      else return await this.browseFeedsMenu(player);
    }

    const form = new ActionFormData();
    form.title(`📰 ${feedData.title}`);

    let bodyText = `Category: §l${feed.category}§r\n`;
    bodyText += `Items: §l${feedData.items.length}§r\n`;
    bodyText += `Last Update: §l${feed.lastUpdate ? new Date(feed.lastUpdate).toLocaleString() : "Never"}§r\n\n`;
    bodyText += `§7Latest Items:§r\n`;

    feedData.items.slice(0, 3).forEach((item, idx) => {
      bodyText += `\n${idx + 1}. ${item.title.substring(0, 30)}...\n${this.feedManager.parser.getRelativeTime(item.pubDate)}\n`;
    });

    form.body(bodyText);
    form.button("📖 View Items");
    form.button(`${feed.notifyPlayers.includes(player.id) ? "🔔" : "🔕"} Toggle Notify`);
    form.button("✏️ Edit");
    form.button("🗑️ Delete");
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.browseFeedsMenu(player);

      switch (response.selection) {
        case 0: return await this.viewItemsMenu(player, feedData, feed);
        case 1:
          if (feed.notifyPlayers.includes(player.id)) {
            this.feedManager.unsubscribeFeed(feed.id, player.id);
            player.sendMessage(`§c✗ Unsubscribed from feed notifications`);
          } else {
            this.feedManager.subscribeFeed(feed.id, player.id);
            player.sendMessage(`§a✓ Subscribed to feed notifications`);
          }
          return await this.viewFeedMenu(player, feed);
        case 2: return await this.editFeedMenu(player, feed);
        case 3:
          this.feedManager.removeFeed(feed.id);
          player.sendMessage(`§a✓ Feed deleted`);
          return await this.browseFeedsMenu(player);
        case 4: return await this.browseFeedsMenu(player);
      }
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] View feed error:`, error);
    }
  }

  /**
   * View feed items
   */
  async viewItemsMenu(player, feedData, feed) {
    const form = new ActionFormData();
    form.title(`Items (${feedData.items.length})`);
    form.body(`Feed: §l${feedData.title}§r\n\nSelect an item to view:\n`);

    feedData.items.forEach((item) => {
      form.button(`${item.title.substring(0, 25)}...\n${this.feedManager.parser.getRelativeTime(item.pubDate)}`);
    });
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled || response.selection === feedData.items.length) {
        return await this.viewFeedMenu(player, feed);
      }

      const item = feedData.items[response.selection];
      return await this.viewItemDetailMenu(player, item, feed);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Items menu error:`, error);
    }
  }

  /**
   * View item details
   */
  async viewItemDetailMenu(player, item, feed) {
    const form = new MessageFormData();
    form.title(item.title);

    let bodyText = `§l${item.title}§r\n`;
    bodyText += `Category: §7${item.category || "General"}§r\n`;
    bodyText += `Author: §7${item.author || "Unknown"}§r\n`;
    bodyText += `Date: §7${this.feedManager.parser.formatDate(item.pubDate)}§r\n\n`;
    bodyText += `§7Description:§r\n${item.description || "No description available"}`;

    form.body(bodyText);
    form.button1("Copy Link");
    form.button2("Back");

    try {
      const response = await form.show(player);
      if (response.selection === 0) {
        player.sendMessage(`§a✓ Link copied: ${item.link}`);
      }
      return await this.viewItemsMenu(player, { items: [item] }, feed);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Item detail error:`, error);
    }
  }

  /**
   * Add feed menu
   */
  async addFeedMenu(player) {
    const form = new ModalFormData();
    form.title("Add New Feed");
    form.textField("Feed URL", "https://example.com/feed.xml", "");
    form.textField("Category", "General", "");

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.mainMenu(player);

      const [url, category] = response.formValues;

      if (!url || !url.startsWith("http")) {
        player.sendMessage(`§c✗ Invalid URL format`);
        return await this.addFeedMenu(player);
      }

      const feedId = this.feedManager.addFeed(url, category || "General", player.id);

      if (feedId) {
        player.sendMessage(`§a✓ Feed added successfully!`);
        this.discord.sendNotification("Feed Added", `New RSS feed added:\n${url}\nCategory: ${category || "General"}`, "success");
      } else {
        player.sendMessage(`§c✗ Failed to add feed`);
      }

      return await this.mainMenu(player);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Add feed error:`, error);
    }
  }

  /**
   * Edit feed menu
   */
  async editFeedMenu(player, feed) {
    const form = new ModalFormData();
    form.title("Edit Feed");
    form.textField("Feed URL", feed.url, feed.url);
    form.textField("Category", feed.category, feed.category);
    form.toggle("Enabled", feed.enabled);

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.viewFeedMenu(player, feed);

      const [url, category, enabled] = response.formValues;

      feed.url = url;
      feed.category = category;
      feed.enabled = enabled;

      feedsTable.set(feed.id, feed);
      player.sendMessage(`§a✓ Feed updated`);

      return await this.viewFeedMenu(player, feed);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Edit feed error:`, error);
    }
  }

  /**
   * Settings menu
   */
  async settingsMenu(player) {
    const settings = settingsTable.get("global") || {
      autoUpdate: true,
      updateInterval: 600,
      maxItems: 5,
      enableDiscord: bridgeAvailable
    };

    const form = new ActionFormData();
    form.title("⚙️ Settings");
    form.body(`Current Settings:\n\nAuto Update: ${settings.autoUpdate ? "§aEnabled§r" : "§cDisabled§r"}\nUpdate Interval: §l${settings.updateInterval}§rs\nMax Items: §l${settings.maxItems}§r\n${settings.enableDiscord ? "Discord Integration: §aEnabled§r" : "Discord Integration: §cDisabled§r"}`);
    form.button("🔄 Toggle Auto-Update");
    form.button("⏱️ Update Interval");
    form.button("📊 Max Items");
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.mainMenu(player);

      switch (response.selection) {
        case 0:
          settings.autoUpdate = !settings.autoUpdate;
          settingsTable.set("global", settings);
          player.sendMessage(`§a✓ Auto-update ${settings.autoUpdate ? "enabled" : "disabled"}`);
          return await this.settingsMenu(player);
        case 1:
          return await this.setUpdateIntervalMenu(player, settings);
        case 2:
          return await this.setMaxItemsMenu(player, settings);
        case 3:
          return await this.mainMenu(player);
      }
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Settings error:`, error);
    }
  }

  /**
   * Set update interval
   */
  async setUpdateIntervalMenu(player, settings) {
    const form = new ActionFormData();
    form.title("Update Interval");
    form.body("Select update frequency:");
    form.button("⚡ 5 minutes\n300s");
    form.button("🔄 10 minutes\n600s");
    form.button("⏳ 30 minutes\n1800s");
    form.button("⌛ 1 hour\n3600s");
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.settingsMenu(player);

      const intervals = [300, 600, 1800, 3600];
      if (response.selection < 4) {
        settings.updateInterval = intervals[response.selection];
        settingsTable.set("global", settings);
        player.sendMessage(`§a✓ Update interval set to ${settings.updateInterval}s`);
      }

      return await this.settingsMenu(player);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Update interval error:`, error);
    }
  }

  /**
   * Set max items
   */
  async setMaxItemsMenu(player, settings) {
    const form = new ActionFormData();
    form.title("Max Items Display");
    form.body("Select maximum items to display:");
    form.button("3 Items");
    form.button("5 Items");
    form.button("10 Items");
    form.button("20 Items");
    form.button("🔙 Back");

    try {
      const response = await form.show(player);
      if (response.canceled) return await this.settingsMenu(player);

      const counts = [3, 5, 10, 20];
      if (response.selection < 4) {
        settings.maxItems = counts[response.selection];
        settingsTable.set("global", settings);
        player.sendMessage(`§a✓ Max items set to ${settings.maxItems}`);
      }

      return await this.settingsMenu(player);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] Max items error:`, error);
    }
  }

  /**
   * About menu
   */
  async aboutMenu(player) {
    const form = new MessageFormData();
    form.title("ℹ️ About");

    let aboutText = `§l${VERSION_INFO.name}§r\n`;
    aboutText += `Version: §l${VERSION_INFO.version}§r (${VERSION_INFO.build})\n`;
    aboutText += `Build Type: ${VERSION_INFO.release_type === 0 ? "§4Development§r" : (VERSION_INFO.release_type === 1 ? "§eBeta§r" : "§aStable§r")}\n\n`;
    aboutText += `§7Features:§r\n`;
    aboutText += `• RSS Feed Parsing\n`;
    aboutText += `• Automatic Updates\n`;
    aboutText += `• Discord Integration\n`;
    aboutText += `• Feed Management\n`;
    aboutText += `• Player Subscriptions\n\n`;
    aboutText += `§7Thanks to:§r\n`;
    aboutText += `• TheFelixLive (Original RSS-Feed)\n`;
    aboutText += `• BedrockBridge Community`;

    form.body(aboutText);
    form.button1("Back");

    try {
      await form.show(player);
      return await this.mainMenu(player);
    } catch (error) {
      console.error(`[${VERSION_INFO.name}] About menu error:`, error);
    }
  }
}

// ================= INITIALIZATION =================
const feedManager = new FeedManager();
const discordIntegration = new DiscordIntegration();
const uiManager = new UIManager(feedManager, discordIntegration);

console.warn(`[${VERSION_INFO.name}] v${VERSION_INFO.version} loaded (Build ${VERSION_INFO.build})`);

// ================= BRIDGE INTEGRATION =================
if (bridgeAvailable) {
  try {
    bridge.events.bridgeInitialize.subscribe((e) => {
      e.registerAddition("rss_direct_message");
      console.warn(`[${VERSION_INFO.name}] Registered bridgeDirect addition`);
    });
  } catch (error) {
    console.warn(`[${VERSION_INFO.name}] Bridge registration error:`, error);
  }
}

// ================= PLAYER EVENTS =================
world.afterEvents.playerJoin.subscribe((event) => {
  const player = event.player;
  console.warn(`[${VERSION_INFO.name}] Player joined: ${player.name}`);
  player.sendMessage(`§a✓ ${VERSION_INFO.name} loaded! Use /feed to open the menu`);
});

// ================= CHAT COMMANDS =================
world.afterEvents.chatSend.subscribe((event) => {
  const player = event.sender;
  const message = event.message;

  if (message === "!feed" || message === "/feed") {
    event.cancel = true;
    uiManager.mainMenu(player);
  }

  if (message.startsWith("!addfeed ")) {
    event.cancel = true;
    const url = message.substring(9).trim();
    if (url) {
      const feedId = feedManager.addFeed(url, "General", player.id);
      if (feedId) {
        player.sendMessage(`§a✓ Feed added: ${feedId}`);
        discordIntegration.sendNotification("Feed Added", `New RSS feed added by ${player.name}:\n${url}`, "info");
      } else {
        player.sendMessage(`§c✗ Failed to add feed`);
      }
    } else {
      player.sendMessage(`§c✗ Usage: !addfeed <url>`);
    }
  }

  if (message === "!feeds") {
    event.cancel = true;
    const feeds = feedManager.getAllFeeds();
    player.sendMessage(`§l§6Current Feeds (${feeds.length}):§r`);
    feeds.forEach((feed, idx) => {
      player.sendMessage(`${idx + 1}. §l${feed.category}§r: ${feed.url.substring(0, 40)}...`);
    });
  }
});

// ================= AUTOMATIC UPDATES =================
let updateTicker = 0;
const updateCheckInterval = 600; // Check every 10 minutes (600 ticks = 30 seconds * 20 TPS)

system.runInterval(() => {
  updateTicker++;

  if (updateTicker >= updateCheckInterval) {
    updateTicker = 0;

    const settings = settingsTable.get("global") || { autoUpdate: true };
    if (!settings.autoUpdate) return;

    system.run(async () => {
      const feeds = feedManager.getAllFeeds();

      for (const feed of feeds) {
        if (!feed.enabled) continue;

        const feedData = await feedManager.fetchFeed(feed.url);
        if (!feedData) continue;

        feed.lastUpdate = Date.now();
        feedsTable.set(feed.id, feed);

        // Notify subscribed players and Discord
        if (feedData.items.length > 0) {
          const newItems = feedData.items.slice(0, 3);
          discordIntegration.sendFeedUpdate(feedData, newItems);

          // Update history
          updateHistoryTable.set(`${feed.id}_${Date.now()}`, {
            feedId: feed.id,
            itemCount: feedData.items.length,
            timestamp: Date.now()
          });
        }
      }

      console.warn(`[${VERSION_INFO.name}] Feed update cycle completed`);
    });
  }
}, 20); // Run every second

console.warn(`[${VERSION_INFO.name}] All systems operational. Type !feed to start`);
