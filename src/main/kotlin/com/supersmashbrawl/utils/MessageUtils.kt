package com.supersmashbrawl.utils

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.config.ConfigManager
import net.kyori.adventure.text.Component
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer
import org.bukkit.ChatColor

object MessageUtils {
    
    private val plugin: SuperSmashBrawlPlugin
        get() = SuperSmashBrawlPlugin.instance
    
    /**
     * Format a message with color codes and placeholders
     */
    fun formatMessage(messageKey: String, placeholders: Map<String, String> = emptyMap()): String {
        val prefix = plugin.configManager.getString(ConfigManager.MESSAGES_CONFIG, "prefix") ?: ""
        val message = plugin.configManager.getString(ConfigManager.MESSAGES_CONFIG, messageKey) ?: messageKey
        
        var formattedMessage = prefix + message
        
        // Replace placeholders
        placeholders.forEach { (key, value) ->
            formattedMessage = formattedMessage.replace("{$key}", value)
        }
        
        return colorize(formattedMessage)
    }
    
    /**
     * Format a message without prefix
     */
    fun formatMessageNoPrefix(messageKey: String, placeholders: Map<String, String> = emptyMap()): String {
        val message = plugin.configManager.getString(ConfigManager.MESSAGES_CONFIG, messageKey) ?: messageKey
        
        var formattedMessage = message
        
        // Replace placeholders
        placeholders.forEach { (key, value) ->
            formattedMessage = formattedMessage.replace("{$key}", value)
        }
        
        return colorize(formattedMessage)
    }
    
    /**
     * Colorize a string with legacy color codes
     */
    fun colorize(text: String): String {
        return ChatColor.translateAlternateColorCodes('&', text)
    }
    
    /**
     * Convert legacy color codes to Adventure Component
     */
    fun toComponent(text: String): Component {
        return LegacyComponentSerializer.legacyAmpersand().deserialize(text)
    }
    
    /**
     * Strip color codes from text
     */
    fun stripColor(text: String): String {
        return ChatColor.stripColor(text) ?: text
    }
    
    /**
     * Send a formatted message to a player
     */
    fun sendMessage(player: org.bukkit.entity.Player, messageKey: String, placeholders: Map<String, String> = emptyMap()) {
        player.sendMessage(formatMessage(messageKey, placeholders))
    }
    
    /**
     * Send an action bar message to a player
     */
    fun sendActionBar(player: org.bukkit.entity.Player, messageKey: String, placeholders: Map<String, String> = emptyMap()) {
        val message = formatMessageNoPrefix(messageKey, placeholders)
        player.sendActionBar(toComponent(message))
    }
    
    /**
     * Broadcast a formatted message to all online players
     */
    fun broadcast(messageKey: String, placeholders: Map<String, String> = emptyMap()) {
        val message = formatMessage(messageKey, placeholders)
        plugin.server.broadcastMessage(message)
    }
    
    /**
     * Create a centered message
     */
    fun centerMessage(message: String, lineLength: Int = 53): String {
        val stripped = stripColor(message)
        val spaces = (lineLength - stripped.length) / 2
        return " ".repeat(maxOf(0, spaces)) + message
    }
    
    /**
     * Create a line separator
     */
    fun createSeparator(char: Char = '=', length: Int = 53, color: ChatColor = ChatColor.GRAY): String {
        return color.toString() + char.toString().repeat(length)
    }
    
    /**
     * Format time in seconds to a readable format
     */
    fun formatTime(seconds: Long): String {
        val minutes = seconds / 60
        val remainingSeconds = seconds % 60
        
        return when {
            minutes > 0 -> "${minutes}m ${remainingSeconds}s"
            else -> "${remainingSeconds}s"
        }
    }
    
    /**
     * Format duration in milliseconds to a readable format
     */
    fun formatDuration(milliseconds: Long): String {
        val seconds = milliseconds / 1000
        return formatTime(seconds)
    }
    
    /**
     * Create a progress bar
     */
    fun createProgressBar(
        current: Double,
        max: Double,
        length: Int = 20,
        progressChar: Char = '█',
        emptyChar: Char = '░',
        progressColor: ChatColor = ChatColor.GREEN,
        emptyColor: ChatColor = ChatColor.GRAY
    ): String {
        val percentage = (current / max).coerceIn(0.0, 1.0)
        val progressLength = (length * percentage).toInt()
        val emptyLength = length - progressLength
        
        return progressColor.toString() + progressChar.toString().repeat(progressLength) +
               emptyColor.toString() + emptyChar.toString().repeat(emptyLength)
    }
}