package com.supersmashbrawl.command.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.arena.ArenaBoundary
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.command.Command
import org.bukkit.command.CommandExecutor
import org.bukkit.command.CommandSender
import org.bukkit.command.TabCompleter
import org.bukkit.entity.Player

class ArenaCommand(private val plugin: SuperSmashBrawlPlugin) : CommandExecutor, TabCompleter {
    
    override fun onCommand(sender: CommandSender, command: Command, label: String, args: Array<out String>): Boolean {
        if (!sender.hasPermission("supersmashbrawl.admin")) {
            sender.sendMessage(MessageUtils.formatMessage("error.no-permission"))
            return true
        }
        
        if (args.isEmpty()) {
            showArenaHelp(sender)
            return true
        }
        
        when (args[0].lowercase()) {
            "list" -> handleArenaList(sender)
            "info" -> handleArenaInfo(sender, args)
            "create" -> handleArenaCreate(sender, args)
            "delete" -> handleArenaDelete(sender, args)
            "reload" -> handleArenaReload(sender)
            "help" -> showArenaHelp(sender)
            else -> {
                sender.sendMessage(MessageUtils.formatMessage("error.unknown-command"))
                showArenaHelp(sender)
            }
        }
        
        return true
    }
    
    override fun onTabComplete(sender: CommandSender, command: Command, alias: String, args: Array<out String>): List<String> {
        if (args.size == 1) {
            return listOf("list", "info", "create", "delete", "reload", "help").filter { it.startsWith(args[0].lowercase()) }
        }
        
        if (args.size == 2) {
            when (args[0].lowercase()) {
                "info", "delete" -> {
                    return plugin.arenaManager.getAllArenas().map { it.name }.filter { it.startsWith(args[1].lowercase()) }
                }
            }
        }
        
        return emptyList()
    }
    
    private fun handleArenaList(sender: CommandSender) {
        val arenas = plugin.arenaManager.getAllArenas()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lArena List"))
        sender.sendMessage("")
        
        if (arenas.isEmpty()) {
            sender.sendMessage("&cNo arenas are configured")
        } else {
            arenas.forEach { arena ->
                val status = if (arena.isInUse) "&c[IN USE]" else "&a[AVAILABLE]"
                val valid = if (arena.isValid()) "&a✓" else "&c✗"
                
                sender.sendMessage("$valid &e${arena.name} $status")
                sender.sendMessage("  &7World: &f${arena.world.name}")
                sender.sendMessage("  &7Spawn Points: &f${arena.spawnPoints.size}")
                sender.sendMessage("  &7Has Spectator Spawn: &f${arena.spectatorSpawn != null}")
                sender.sendMessage("")
            }
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun handleArenaInfo(sender: CommandSender, args: Array<out String>) {
        if (args.size < 2) {
            sender.sendMessage("&cUsage: /arena info <arena_name>")
            return
        }
        
        val arenaName = args[1]
        val arena = plugin.arenaManager.getArena(arenaName)
        
        if (arena == null) {
            sender.sendMessage("&cArena '$arenaName' not found")
            return
        }
        
        val arenaInfo = arena.getInfo()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lArena Info: ${arena.name}"))
        sender.sendMessage("")
        
        arenaInfo.forEach { (key, value) ->
            val displayKey = key.replace("_", " ").split(" ").joinToString(" ") { word ->
                word.replaceFirstChar { it.uppercase() }
            }
            sender.sendMessage("&e$displayKey: &f$value")
        }
        
        sender.sendMessage("")
        sender.sendMessage("&7Additional Details:")
        sender.sendMessage("  &7Center: &f${arena.center.x}, ${arena.center.y}, ${arena.center.z}")
        arena.spectatorSpawn?.let { spawn ->
            sender.sendMessage("  &7Spectator Spawn: &f${spawn.x}, ${spawn.y}, ${spawn.z}")
        }
        
        if (arena.boundary != null) {
            when (val boundary = arena.boundary) {
                is ArenaBoundary.Rectangular -> {
                    sender.sendMessage("  &7Boundary: &fRectangular (${boundary.minX}, ${boundary.minZ}) to (${boundary.maxX}, ${boundary.maxZ})")
                }
                is ArenaBoundary.Circular -> {
                    sender.sendMessage("  &7Boundary: &fCircular center (${boundary.centerX}, ${boundary.centerZ}) radius ${boundary.radius}")
                }
            }
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun handleArenaCreate(sender: CommandSender, args: Array<out String>) {
        if (sender !is Player) {
            sender.sendMessage(MessageUtils.formatMessage("error.player-only"))
            return
        }
        
        if (args.size < 2) {
            sender.sendMessage("&cUsage: /arena create <arena_name>")
            return
        }
        
        val arenaName = args[1]
        
        if (plugin.arenaManager.hasArena(arenaName)) {
            sender.sendMessage("&cArena '$arenaName' already exists")
            return
        }
        
        val location = sender.location
        val spawnPoints = listOf(location, location.clone().add(10.0, 0.0, 0.0)) // Default 2 spawn points
        
        val arena = plugin.arenaManager.createArena(
            name = arenaName,
            center = location,
            spawnPoints = spawnPoints,
            spectatorSpawn = location.clone().add(0.0, 10.0, 0.0)
        )
        
        if (arena != null) {
            sender.sendMessage("&aCreated arena '$arenaName' at your current location")
            sender.sendMessage("&7Note: You may want to configure spawn points and boundaries in the config file")
        } else {
            sender.sendMessage("&cFailed to create arena '$arenaName'")
        }
    }
    
    private fun handleArenaDelete(sender: CommandSender, args: Array<out String>) {
        if (args.size < 2) {
            sender.sendMessage("&cUsage: /arena delete <arena_name>")
            return
        }
        
        val arenaName = args[1]
        
        if (plugin.arenaManager.deleteArena(arenaName)) {
            sender.sendMessage("&aDeleted arena '$arenaName'")
        } else {
            sender.sendMessage("&cArena '$arenaName' not found")
        }
    }
    
    private fun handleArenaReload(sender: CommandSender) {
        try {
            plugin.arenaManager.reloadArenas()
            sender.sendMessage("&aReloaded arenas successfully")
        } catch (e: Exception) {
            sender.sendMessage("&cFailed to reload arenas: ${e.message}")
        }
    }
    
    private fun showArenaHelp(sender: CommandSender) {
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lArena Admin Commands"))
        sender.sendMessage("")
        sender.sendMessage("&e/arena list &7- List all arenas")
        sender.sendMessage("&e/arena info <name> &7- Show detailed arena information")
        sender.sendMessage("&e/arena create <name> &7- Create a new arena at your location")
        sender.sendMessage("&e/arena delete <name> &7- Delete an arena")
        sender.sendMessage("&e/arena reload &7- Reload arenas from config")
        sender.sendMessage("&e/arena help &7- Show this help message")
        sender.sendMessage("")
        sender.sendMessage("&7Note: For advanced arena configuration, edit the arenas.yml file")
        sender.sendMessage(MessageUtils.createSeparator())
    }
}