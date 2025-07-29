package com.supersmashbrawl.arena

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.config.ConfigManager
import org.bukkit.Bukkit
import org.bukkit.Location
import org.bukkit.configuration.ConfigurationSection
import java.util.concurrent.ConcurrentHashMap
import java.util.logging.Level

class ArenaManager(private val plugin: SuperSmashBrawlPlugin) {
    
    private val arenas = ConcurrentHashMap<String, Arena>()
    private val availableArenas = mutableSetOf<Arena>()
    
    init {
        loadArenas()
    }
    
    /**
     * Load all arenas from configuration
     */
    fun loadArenas() {
        arenas.clear()
        availableArenas.clear()
        
        val config = plugin.configManager.getConfig(ConfigManager.ARENAS_CONFIG)
        val arenasSection = config.getConfigurationSection("arenas") ?: return
        
        for (arenaName in arenasSection.getKeys(false)) {
            try {
                val arenaSection = arenasSection.getConfigurationSection(arenaName) ?: continue
                val arena = loadArenaFromConfig(arenaName, arenaSection)
                
                if (arena.isValid()) {
                    arenas[arenaName] = arena
                    if (!arena.isInUse) {
                        availableArenas.add(arena)
                    }
                    plugin.logger.info("Loaded arena: $arenaName")
                } else {
                    plugin.logger.warning("Arena '$arenaName' is not valid and was skipped")
                }
            } catch (e: Exception) {
                plugin.logger.log(Level.SEVERE, "Failed to load arena '$arenaName'", e)
            }
        }
        
        plugin.logger.info("Loaded ${arenas.size} arena(s)")
    }
    
    /**
     * Reload all arenas
     */
    fun reloadArenas() {
        plugin.configManager.reloadConfig(ConfigManager.ARENAS_CONFIG)
        loadArenas()
    }
    
    /**
     * Get an arena by name
     */
    fun getArena(name: String): Arena? = arenas[name]
    
    /**
     * Get all arenas
     */
    fun getAllArenas(): List<Arena> = arenas.values.toList()
    
    /**
     * Get all available (not in use) arenas
     */
    fun getAvailableArenas(): List<Arena> = availableArenas.toList()
    
    /**
     * Get a random available arena
     */
    fun getRandomAvailableArena(): Arena? = availableArenas.randomOrNull()
    
    /**
     * Mark an arena as in use
     */
    fun markArenaInUse(arena: Arena): Boolean {
        if (arena.isInUse) return false
        
        arena.isInUse = true
        availableArenas.remove(arena)
        return true
    }
    
    /**
     * Mark an arena as available
     */
    fun markArenaAvailable(arena: Arena): Boolean {
        if (!arena.isInUse) return false
        
        arena.isInUse = false
        availableArenas.add(arena)
        return true
    }
    
    /**
     * Create a new arena
     */
    fun createArena(
        name: String,
        center: Location,
        spawnPoints: List<Location>,
        spectatorSpawn: Location? = null,
        minY: Double = Double.MIN_VALUE,
        maxY: Double = Double.MAX_VALUE,
        boundary: ArenaBoundary? = null
    ): Arena? {
        if (arenas.containsKey(name)) {
            return null // Arena already exists
        }
        
        val arena = Arena(
            name = name,
            world = center.world,
            center = center,
            spawnPoints = spawnPoints,
            spectatorSpawn = spectatorSpawn,
            minY = minY,
            maxY = maxY,
            boundary = boundary
        )
        
        if (!arena.isValid()) {
            return null
        }
        
        arenas[name] = arena
        availableArenas.add(arena)
        
        // Save to config
        saveArenaToConfig(arena)
        
        return arena
    }
    
    /**
     * Delete an arena
     */
    fun deleteArena(name: String): Boolean {
        val arena = arenas.remove(name) ?: return false
        availableArenas.remove(arena)
        
        // Remove from config
        val config = plugin.configManager.getConfig(ConfigManager.ARENAS_CONFIG)
        config.set("arenas.$name", null)
        plugin.configManager.saveConfig(ConfigManager.ARENAS_CONFIG)
        
        return true
    }
    
    /**
     * Check if an arena exists
     */
    fun hasArena(name: String): Boolean = arenas.containsKey(name)
    
    /**
     * Get arena count
     */
    fun getArenaCount(): Int = arenas.size
    
    /**
     * Get available arena count
     */
    fun getAvailableArenaCount(): Int = availableArenas.size
    
    private fun loadArenaFromConfig(name: String, section: ConfigurationSection): Arena {
        // Load world
        val worldName = section.getString("world") ?: throw IllegalArgumentException("World not specified")
        val world = Bukkit.getWorld(worldName) ?: throw IllegalArgumentException("World '$worldName' not found")
        
        // Load center location
        val center = loadLocationFromConfig(section.getConfigurationSection("center") ?: throw IllegalArgumentException("Center not specified"), world)
        
        // Load spawn points
        val spawnPointsSection = section.getConfigurationSection("spawnPoints") ?: throw IllegalArgumentException("Spawn points not specified")
        val spawnPoints = mutableListOf<Location>()
        for (key in spawnPointsSection.getKeys(false)) {
            val spawnSection = spawnPointsSection.getConfigurationSection(key) ?: continue
            spawnPoints.add(loadLocationFromConfig(spawnSection, world))
        }
        
        // Load optional spectator spawn
        val spectatorSpawn = section.getConfigurationSection("spectatorSpawn")?.let { 
            loadLocationFromConfig(it, world) 
        }
        
        // Load boundaries
        val minY = section.getDouble("minY", Double.MIN_VALUE)
        val maxY = section.getDouble("maxY", Double.MAX_VALUE)
        
        // Load boundary
        val boundary = section.getConfigurationSection("boundary")?.let { boundarySection ->
            val type = boundarySection.getString("type")
            when (type) {
                "rectangular" -> ArenaBoundary.Rectangular(
                    minX = boundarySection.getDouble("minX"),
                    maxX = boundarySection.getDouble("maxX"),
                    minZ = boundarySection.getDouble("minZ"),
                    maxZ = boundarySection.getDouble("maxZ")
                )
                "circular" -> ArenaBoundary.Circular(
                    centerX = boundarySection.getDouble("centerX"),
                    centerZ = boundarySection.getDouble("centerZ"),
                    radius = boundarySection.getDouble("radius")
                )
                else -> null
            }
        }
        
        // Load metadata
        val metadata = section.getConfigurationSection("metadata")?.let { metaSection ->
            metaSection.getKeys(false).associateWith { key ->
                metaSection.get(key) ?: ""
            }
        } ?: emptyMap()
        
        return Arena(
            name = name,
            world = world,
            center = center,
            spawnPoints = spawnPoints,
            spectatorSpawn = spectatorSpawn,
            minY = minY,
            maxY = maxY,
            boundary = boundary,
            metadata = metadata
        )
    }
    
    private fun loadLocationFromConfig(section: ConfigurationSection, world: org.bukkit.World): Location {
        val x = section.getDouble("x")
        val y = section.getDouble("y")
        val z = section.getDouble("z")
        val yaw = section.getDouble("yaw", 0.0).toFloat()
        val pitch = section.getDouble("pitch", 0.0).toFloat()
        
        return Location(world, x, y, z, yaw, pitch)
    }
    
    private fun saveArenaToConfig(arena: Arena) {
        val config = plugin.configManager.getConfig(ConfigManager.ARENAS_CONFIG)
        val arenaPath = "arenas.${arena.name}"
        
        config.set("$arenaPath.world", arena.world.name)
        
        // Save center
        saveLocationToConfig(config, "$arenaPath.center", arena.center)
        
        // Save spawn points
        arena.spawnPoints.forEachIndexed { index, location ->
            saveLocationToConfig(config, "$arenaPath.spawnPoints.$index", location)
        }
        
        // Save spectator spawn
        arena.spectatorSpawn?.let { spectatorSpawn ->
            saveLocationToConfig(config, "$arenaPath.spectatorSpawn", spectatorSpawn)
        }
        
        // Save boundaries
        if (arena.minY != Double.MIN_VALUE) {
            config.set("$arenaPath.minY", arena.minY)
        }
        if (arena.maxY != Double.MAX_VALUE) {
            config.set("$arenaPath.maxY", arena.maxY)
        }
        
        // Save boundary
        arena.boundary?.let { boundary ->
            when (boundary) {
                is ArenaBoundary.Rectangular -> {
                    config.set("$arenaPath.boundary.type", "rectangular")
                    config.set("$arenaPath.boundary.minX", boundary.minX)
                    config.set("$arenaPath.boundary.maxX", boundary.maxX)
                    config.set("$arenaPath.boundary.minZ", boundary.minZ)
                    config.set("$arenaPath.boundary.maxZ", boundary.maxZ)
                }
                is ArenaBoundary.Circular -> {
                    config.set("$arenaPath.boundary.type", "circular")
                    config.set("$arenaPath.boundary.centerX", boundary.centerX)
                    config.set("$arenaPath.boundary.centerZ", boundary.centerZ)
                    config.set("$arenaPath.boundary.radius", boundary.radius)
                }
            }
        }
        
        // Save metadata
        arena.metadata.forEach { (key, value) ->
            config.set("$arenaPath.metadata.$key", value)
        }
        
        plugin.configManager.saveConfig(ConfigManager.ARENAS_CONFIG)
    }
    
    private fun saveLocationToConfig(config: org.bukkit.configuration.file.FileConfiguration, path: String, location: Location) {
        config.set("$path.x", location.x)
        config.set("$path.y", location.y)
        config.set("$path.z", location.z)
        config.set("$path.yaw", location.yaw.toDouble())
        config.set("$path.pitch", location.pitch.toDouble())
    }
}