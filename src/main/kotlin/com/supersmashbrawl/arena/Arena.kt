package com.supersmashbrawl.arena

import org.bukkit.Location
import org.bukkit.World

data class Arena(
    val name: String,
    val world: World,
    val center: Location,
    val spawnPoints: List<Location>,
    val spectatorSpawn: Location? = null,
    val minY: Double = Double.MIN_VALUE,
    val maxY: Double = Double.MAX_VALUE,
    val boundary: ArenaBoundary? = null,
    var isInUse: Boolean = false,
    val metadata: Map<String, Any> = emptyMap()
) {
    
    /**
     * Check if a location is within the arena boundaries
     */
    fun isLocationInArena(location: Location): Boolean {
        if (location.world != world) return false
        
        if (location.y < minY || location.y > maxY) return false
        
        return boundary?.contains(location) ?: true
    }
    
    /**
     * Get the distance from a location to the arena center
     */
    fun getDistanceToCenter(location: Location): Double {
        return if (location.world == world) {
            location.distance(center)
        } else {
            Double.MAX_VALUE
        }
    }
    
    /**
     * Check if the arena is properly configured
     */
    fun isValid(): Boolean {
        return spawnPoints.isNotEmpty() && 
               spawnPoints.all { it.world == world } &&
               (spectatorSpawn?.world == world ?: true)
    }
    
    /**
     * Get arena information as a map
     */
    fun getInfo(): Map<String, Any> {
        return mapOf(
            "name" to name,
            "world" to world.name,
            "center" to locationToString(center),
            "spawnPoints" to spawnPoints.size,
            "hasSpectatorSpawn" to (spectatorSpawn != null),
            "inUse" to isInUse,
            "valid" to isValid()
        )
    }
    
    private fun locationToString(location: Location): String {
        return "${location.x}, ${location.y}, ${location.z}"
    }
}

/**
 * Represents arena boundaries
 */
sealed class ArenaBoundary {
    abstract fun contains(location: Location): Boolean
    
    data class Rectangular(
        val minX: Double,
        val maxX: Double,
        val minZ: Double,
        val maxZ: Double
    ) : ArenaBoundary() {
        override fun contains(location: Location): Boolean {
            return location.x >= minX && location.x <= maxX &&
                   location.z >= minZ && location.z <= maxZ
        }
    }
    
    data class Circular(
        val centerX: Double,
        val centerZ: Double,
        val radius: Double
    ) : ArenaBoundary() {
        override fun contains(location: Location): Boolean {
            val dx = location.x - centerX
            val dz = location.z - centerZ
            return (dx * dx + dz * dz) <= (radius * radius)
        }
    }
}