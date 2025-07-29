package com.supersmashbrawl.command.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.ChatColor
import org.bukkit.command.Command
import org.bukkit.command.CommandExecutor
import org.bukkit.command.CommandSender
import org.bukkit.command.TabCompleter
import org.bukkit.entity.Player

class MainCommand(private val plugin: SuperSmashBrawlPlugin) : CommandExecutor, TabCompleter {
    
    override fun onCommand(sender: CommandSender, command: Command, label: String, args: Array<out String>): Boolean {
        if (args.isEmpty()) {
            showHelp(sender)
            return true
        }
        
        when (args[0].lowercase()) {
            "help" -> showHelp(sender)
            "info" -> showInfo(sender)
            "stats" -> showStats(sender)
            "reload" -> handleReload(sender)
            "version" -> showVersion(sender)
            else -> {
                sender.sendMessage(MessageUtils.formatMessage("error.unknown-command"))
                showHelp(sender)
            }
        }
        
        return true
    }
    
    override fun onTabComplete(sender: CommandSender, command: Command, alias: String, args: Array<out String>): List<String> {
        if (args.size == 1) {
            val subcommands = mutableListOf("help", "info", "stats", "version")
            if (sender.hasPermission("supersmashbrawl.admin")) {
                subcommands.add("reload")
            }
            return subcommands.filter { it.startsWith(args[0].lowercase()) }
        }
        return emptyList()
    }
    
    private fun showHelp(sender: CommandSender) {
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("${ChatColor.GOLD}${ChatColor.BOLD}Super Smash Brawl Help"))
        sender.sendMessage("")
        sender.sendMessage("${ChatColor.YELLOW}/1v1 ${ChatColor.GRAY}- Join the 1v1 queue")
        sender.sendMessage("${ChatColor.YELLOW}/ssb info ${ChatColor.GRAY}- Show plugin information")
        sender.sendMessage("${ChatColor.YELLOW}/ssb stats ${ChatColor.GRAY}- Show server statistics")
        sender.sendMessage("${ChatColor.YELLOW}/ssb version ${ChatColor.GRAY}- Show plugin version")
        
        if (sender.hasPermission("supersmashbrawl.admin")) {
            sender.sendMessage("")
            sender.sendMessage("${ChatColor.RED}Admin Commands:")
            sender.sendMessage("${ChatColor.YELLOW}/ssb reload ${ChatColor.GRAY}- Reload the plugin")
            sender.sendMessage("${ChatColor.YELLOW}/queue <subcommand> ${ChatColor.GRAY}- Manage queues")
            sender.sendMessage("${ChatColor.YELLOW}/arena <subcommand> ${ChatColor.GRAY}- Manage arenas")
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun showInfo(sender: CommandSender) {
        val activeGames = plugin.gameManager.getActiveGameCount()
        val totalQueued = plugin.queueManager.getQueueStats().sumOf { it.currentSize }
        val totalArenas = plugin.arenaManager.getArenaCount()
        val availableArenas = plugin.arenaManager.getAvailableArenaCount()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("${ChatColor.GOLD}${ChatColor.BOLD}Super Smash Brawl Info"))
        sender.sendMessage("")
        sender.sendMessage("${ChatColor.YELLOW}Active Games: ${ChatColor.WHITE}$activeGames")
        sender.sendMessage("${ChatColor.YELLOW}Players in Queue: ${ChatColor.WHITE}$totalQueued")
        sender.sendMessage("${ChatColor.YELLOW}Total Arenas: ${ChatColor.WHITE}$totalArenas")
        sender.sendMessage("${ChatColor.YELLOW}Available Arenas: ${ChatColor.WHITE}$availableArenas")
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun showStats(sender: CommandSender) {
        val gameStats = plugin.gameManager.getGameStats()
        val queueStats = plugin.queueManager.getQueueStats()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("${ChatColor.GOLD}${ChatColor.BOLD}Server Statistics"))
        sender.sendMessage("")
        sender.sendMessage("${ChatColor.YELLOW}Game Statistics:")
        sender.sendMessage("  ${ChatColor.GRAY}Active Games: ${ChatColor.WHITE}${gameStats.totalActiveGames}")
        sender.sendMessage("  ${ChatColor.GRAY}Active Players: ${ChatColor.WHITE}${gameStats.totalActivePlayers}")
        
        if (gameStats.gamesByType.isNotEmpty()) {
            sender.sendMessage("  ${ChatColor.GRAY}Games by Type:")
            gameStats.gamesByType.forEach { (type, count) ->
                sender.sendMessage("    ${ChatColor.WHITE}$type: ${ChatColor.YELLOW}$count")
            }
        }
        
        sender.sendMessage("")
        sender.sendMessage("${ChatColor.YELLOW}Queue Statistics:")
        queueStats.forEach { stats ->
            sender.sendMessage("  ${ChatColor.WHITE}${stats.queueType}:")
            sender.sendMessage("    ${ChatColor.GRAY}Players: ${ChatColor.WHITE}${stats.currentSize}")
            sender.sendMessage("    ${ChatColor.GRAY}Avg Wait: ${ChatColor.WHITE}${MessageUtils.formatDuration(stats.averageWaitTime)}")
            sender.sendMessage("    ${ChatColor.GRAY}Max Wait: ${ChatColor.WHITE}${MessageUtils.formatDuration(stats.longestWaitTime)}")
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun handleReload(sender: CommandSender) {
        if (!sender.hasPermission("supersmashbrawl.admin")) {
            sender.sendMessage(MessageUtils.formatMessage("error.no-permission"))
            return
        }
        
        try {
            plugin.reload()
            sender.sendMessage(MessageUtils.formatMessage("admin.reload-success"))
        } catch (e: Exception) {
            sender.sendMessage(MessageUtils.formatMessage("admin.reload-failed"))
            plugin.logger.severe("Failed to reload plugin: ${e.message}")
        }
    }
    
    private fun showVersion(sender: CommandSender) {
        val version = plugin.description.version
        val author = plugin.description.authors.joinToString(", ")
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("${ChatColor.GOLD}${ChatColor.BOLD}Super Smash Brawl"))
        sender.sendMessage("")
        sender.sendMessage("${ChatColor.YELLOW}Version: ${ChatColor.WHITE}$version")
        sender.sendMessage("${ChatColor.YELLOW}Author: ${ChatColor.WHITE}$author")
        sender.sendMessage("${ChatColor.YELLOW}API Version: ${ChatColor.WHITE}${plugin.description.apiVersion}")
        sender.sendMessage(MessageUtils.createSeparator())
    }
}