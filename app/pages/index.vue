<script setup>
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ref, onMounted, watch, computed } from 'vue'

const searchInput = ref('')
const activeSearch = ref('')
const selectedType = ref('ALL') // 'ALL' | 'POWER' | 'WATER'
const sortAscStr = ref('worst') // 'worst' | 'best'

const sortAsc = computed(() => sortAscStr.value === 'worst')

// Fetch outages and leaderboard
const { data: rawOutages, pending } = await useFetch(() => `/api/outages?municipality=${activeSearch.value}`)
const { data: rawLeaderboard } = await useFetch('/api/leaderboard')

// Computed outages filtered by type (POWER/WATER)
const outages = computed(() => {
  if (!rawOutages.value) return []
  return rawOutages.value.filter(item => {
    if (selectedType.value === 'ALL') return true
    const isPower = item.providerSlug === 'meralco'
    if (selectedType.value === 'POWER') return isPower
    if (selectedType.value === 'WATER') return !isPower
    return true
  })
})

// Computed leaderboard based on sort direction
const leaderboard = computed(() => {
  if (!rawLeaderboard.value) return []
  const list = [...rawLeaderboard.value]
  return list.sort((a, b) => {
    return sortAsc.value
      ? a.reliabilityScore - b.reliabilityScore
      : b.reliabilityScore - a.reliabilityScore
  })
})

// Computed existing cities present in the dataset (outages or leaderboard)
const existingCities = computed(() => {
  const cities = new Set()

  if (rawLeaderboard.value) {
    rawLeaderboard.value.forEach(item => {
      if (item.municipality) cities.add(item.municipality.trim())
    })
  }

  if (rawOutages.value) {
    rawOutages.value.forEach(item => {
      if (item.municipality) {
        item.municipality.split(',').forEach(m => {
          const cleaned = m.trim()
          if (cleaned) cities.add(cleaned)
        })
      }
    })
  }

  return Array.from(cities).sort()
})

// Utility function to group affected areas by barangay and deduplicate street names
function groupAreasByBarangay(areas) {
  if (!areas) return []
  const grouped = {}
  for (const area of areas) {
    const b = area.barangay || 'Unknown'
    if (!grouped[b]) {
      grouped[b] = new Set()
    }
    if (area.streetsRaw && area.streetsRaw.trim()) {
      area.streetsRaw.split(',').forEach(s => {
        const cleaned = s.trim()
        if (cleaned) grouped[b].add(cleaned)
      })
    }
  }
  return Object.entries(grouped).map(([barangay, streetsSet]) => ({
    barangay,
    streets: Array.from(streetsSet)
  }))
}

function triggerSearch() {
  activeSearch.value = searchInput.value
}

function clearSearch() {
  searchInput.value = ''
  activeSearch.value = ''
}

// Leaflet integration (runs only client-side)
const mapElement = ref(null)
let map = null
let markersGroup = null

const MUNICIPALITY_COORDS = {
  // Metro Manila
  'Quezon City': [14.6760, 121.0437],
  'Manila': [14.5995, 120.9842],
  'Pasig': [14.5764, 121.0851],
  'Taguig': [14.5176, 121.0509],
  'Mandaluyong': [14.5794, 121.0359],
  'Marikina': [14.6299, 121.0964],
  'Caloocan': [14.6416, 120.9762],
  'Makati': [14.5547, 121.0244],
  'Las Piñas': [14.4445, 120.9939],
  'Muntinlupa': [14.4081, 121.0415],
  'Parañaque': [14.4793, 121.0198],
  'Valenzuela': [14.6975, 120.9656],
  'Malabon': [14.6536, 120.9392],
  'Navotas': [14.6349, 120.9472],
  'San Juan': [14.6019, 121.0355],
  'Pateros': [14.5454, 121.0689],
  // Rizal
  'Antipolo': [14.5842, 121.1763],
  'Cainta': [14.5826, 121.1158],
  'Taytay': [14.5684, 121.1354],
  'San Mateo': [14.6987, 121.1182],
  'Rodriguez': [14.7333, 121.1500],
  'Binangonan': [14.4841, 121.1896],
  'Angono': [14.5298, 121.1541],
  'Rizal': [14.5842, 121.1763],
  // Cavite
  'Bacoor': [14.4146, 120.9427],
  'Imus': [14.4088, 120.9348],
  'Dasmariñas': [14.3294, 120.9367],
  'General Trias': [14.3852, 120.8807],
  'Cavite': [14.2456, 120.9367],
  'Trece Martires': [14.2818, 120.8679],
  'Silang': [14.2255, 120.9760],
  'Carmona': [14.3069, 121.0336],
  // Laguna
  'San Pedro': [14.3562, 121.0573],
  'Biñan': [14.3315, 121.0827],
  'Santa Rosa': [14.3129, 121.1114],
  'Calamba': [14.2146, 121.1627],
  'Cabuyao': [14.2750, 121.1246],
  'Los Baños': [14.1703, 121.2435],
  'Laguna': [14.2750, 121.3653],
  // Bulacan
  'San Jose del Monte': [14.8142, 121.0456],
  'Meycauayan': [14.7381, 120.9614],
  'Marilao': [14.7570, 120.9455],
  'Bocaue': [14.7958, 120.9276],
  'Santa Maria': [14.8211, 120.9576],
  'Malolos': [14.8437, 120.8113],
  'Bulacan': [14.7937, 120.8787],
  // Batangas
  'Batangas': [13.7565, 121.0583],
  'Batangas City': [13.7565, 121.0583],
  'Lipa': [13.9419, 121.1644],
  'Tanauan': [14.0847, 121.1504],
  'Santo Tomas': [14.1083, 121.1444],
  // Pampanga & Others
  'Pampanga': [15.0441, 120.6750],
  'Angeles': [15.1451, 120.5887],
  'San Fernando': [15.0298, 120.6806],
  'Lucena': [13.9314, 121.6173],
  'Quezon': [13.9314, 121.6173]
}

useHead({
  title: 'Patak - Civic Infrastructure Tracker',
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/favicon.svg'
    },
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
      crossorigin: ''
    }
  ]
})

// Focus the map on a specific municipality coordinate
function focusMunicipality(muniName) {
  const cleanName = muniName.split(',')[0].trim()
  const coords = MUNICIPALITY_COORDS[cleanName]
  if (map && coords) {
    map.setView(coords, 13, { animate: true, duration: 1.5 })
  }
}

onMounted(async () => {
  if (process.client) {
    const L = await import('leaflet')

    // Initialize map
    map = L.map(mapElement.value, { zoomControl: false }).setView([14.5764, 121.04], 11)

    // Add light theme tile layer (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://osm.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CartoDB</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    markersGroup = L.layerGroup().addTo(map)

    // Watch outages to paint markers dynamically
    watch(outages, (newOutages) => {
      if (!markersGroup) return
      markersGroup.clearLayers()

      newOutages.forEach((item) => {
        const muni = item.municipality
        const munis = muni.split(',').map(m => m.trim())

        munis.forEach((mName) => {
          const coords = MUNICIPALITY_COORDS[mName]
          if (coords) {
            const isEmergency = item.reasonCategory === 'EMERGENCY'
            const isPower = item.providerSlug === 'meralco'
            
            // Map pin styling classes
            const pulseColor = isEmergency ? 'bg-red-400' : (isPower ? 'bg-amber-400' : 'bg-blue-400')
            const dotColor = isEmergency ? 'bg-red-500 border-red-200' : (isPower ? 'bg-amber-500 border-amber-200' : 'bg-blue-500 border-blue-200')
            
            const customIcon = L.divIcon({
              html: `
                <div class="relative flex items-center justify-center w-6 h-6">
                  <!-- Outer Pulse Ring -->
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75"></span>
                  <!-- Inner Solid Dot with Shadow -->
                  <span class="relative inline-flex rounded-full h-3 w-3 ${dotColor} border border-white shadow-[0_2px_6px_rgba(0,0,0,0.6)]"></span>
                </div>
              `,
              className: 'bg-transparent border-none flex items-center justify-center',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })

            const marker = L.marker(coords, { icon: customIcon })

            const zapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block align-middle mr-1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
            const dropletSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block align-middle mr-1"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>`
            const providerIcon = isPower ? zapSvg : dropletSvg

            marker.bindPopup(`
              <div class="font-sans p-1 max-w-[220px]">
                <div class="flex items-center gap-1 mb-1">
                  ${providerIcon}
                  <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">${item.providerSlug}</span>
                </div>
                <h4 class="font-bold text-sm text-zinc-900 leading-tight">${mName}</h4>
                <p class="text-xs text-zinc-500 mt-1 font-semibold">${item.reasonCategory} · ${item.durationHours}h duration</p>
                <p class="text-[11px] text-zinc-700 mt-1.5 leading-relaxed line-clamp-3">${item.rawText}</p>
                <a href="/outages/${item.id}" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline block mt-2 pt-2 border-t border-zinc-100">View Details &rarr;</a>
              </div>
            `)

            markersGroup.addLayer(marker)
          }
        })
      })
    }, { immediate: true })
  }
})
</script>

<template>
  <div class="container mx-auto px-4 md:px-8 py-8">
    <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Overview</h2>
        <p class="text-muted-foreground mt-1 text-sm">Live civic infrastructure status across multiple regions.</p>
      </div>
      <!-- Search controls -->
      <div class="flex items-center gap-2 w-full max-w-sm">
        <div class="relative w-full">
          <Input v-model="searchInput" @keyup.enter="triggerSearch" list="existing-cities"
            placeholder="Search city (e.g. Quezon City)..."
            class="pr-9 w-full bg-background shadow-sm h-9 rounded-full focus-visible:ring-primary/20" />
          <datalist id="existing-cities">
            <option v-for="city in existingCities" :key="city" :value="city" />
          </datalist>
          <Button v-if="activeSearch" variant="ghost" size="icon" @click="clearSearch"
            class="absolute right-1 top-1 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
            <LucideX class="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button @click="triggerSearch" class="h-9 rounded-full px-4 shadow-sm font-semibold transition-all hover:shadow-md active:scale-95">
          Find
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left column: Active outage list card -->
      <Card class="lg:col-span-5 flex flex-col gap-0 lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24 overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader class="p-5 pb-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0 bg-background/50">
          <div class="flex items-center gap-2.5">
            <div class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            <CardTitle class="text-sm font-bold tracking-wide uppercase">
              Active Outages
            </CardTitle>
          </div>

          <!-- Type filter Tabs -->
          <Tabs v-model="selectedType" class="w-auto">
            <TabsList class="h-8 grid w-full grid-cols-3">
              <TabsTrigger value="ALL" class="text-xs px-2.5 py-1">All</TabsTrigger>
              <TabsTrigger value="POWER" class="text-xs px-2.5 py-1 flex items-center gap-1.5">
                <LucideZap class="h-3.5 w-3.5 text-amber-500" />
                <span>Power</span>
              </TabsTrigger>
              <TabsTrigger value="WATER" class="text-xs px-2.5 py-1 flex items-center gap-1.5">
                <LucideDroplet class="h-3.5 w-3.5 text-blue-500" />
                <span>Water</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <!-- Quick select city suggestion badges -->
        <div v-if="existingCities.length" class="px-5 py-3 border-b border-border/50 flex flex-wrap gap-2 items-center bg-muted/20">
          <span class="text-[10px] uppercase font-bold text-muted-foreground mr-1">Quick Select:</span>
          <Badge v-for="city in existingCities" :key="city" @click="searchInput = city; triggerSearch()"
            variant="outline"
            class="text-[10px] px-2 py-0 hover:bg-secondary cursor-pointer transition-colors shadow-sm font-medium">
            {{ city }}
          </Badge>
        </div>

        <!-- Scrollable outage entries list -->
        <CardContent class="flex-1 p-0 overflow-hidden flex flex-col">
          <ScrollArea class="h-full">
            <div class="p-5 flex flex-col gap-4">
              
              <!-- Loading State -->
              <div v-if="pending" class="flex flex-col gap-4 py-8">
                <Skeleton class="h-32 w-full rounded-xl" v-for="i in 3" :key="i" />
              </div>

              <!-- Empty State -->
              <div v-else-if="!outages || outages.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <LucideSparkles class="h-5 w-5 text-primary" />
                </div>
                <h3 class="font-semibold text-lg">No interruptions found</h3>
                <p class="text-sm text-muted-foreground max-w-[250px] mt-2">
                  Everything looks good! We couldn't find any active outages matching your criteria.
                </p>
              </div>

              <!-- Data State -->
              <template v-else>
                <div v-for="item in outages" :key="item.id" @click="focusMunicipality(item.municipality)"
                  class="group relative p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-md hover:shadow-primary/5 overflow-hidden">
                  
                  <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div class="relative z-10">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex flex-col gap-1.5">
                        <Badge variant="secondary"
                          class="text-[10px] font-mono tracking-wider font-bold px-2 py-0 uppercase bg-primary/10 text-primary border-primary/20 w-fit">
                          {{ item.providerSlug }}
                        </Badge>
                        <h3 class="text-lg font-bold group-hover:text-primary transition-colors leading-tight">
                          {{ item.municipality }}
                        </h3>
                      </div>
                      <div class="flex flex-col items-end gap-1.5">
                        <Badge :variant="item.status === 'UNANNOUNCED' ? 'destructive' : 'outline'"
                          class="text-[10px] font-semibold px-2 py-0">
                          {{ item.status }}
                        </Badge>
                        <span class="text-[11px] text-muted-foreground font-medium flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                          <LucideClock class="h-3 w-3" />
                          {{ item.durationHours }}h
                        </span>
                      </div>
                    </div>

                    <p class="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-3">
                      {{ item.reasonCategory }}
                    </p>

                    <!-- Detailed affected areas -->
                    <div v-if="item.affectedAreas && item.affectedAreas.length" class="mt-4 pt-4 border-t border-border/50 flex flex-col gap-3">
                      <div v-for="group in groupAreasByBarangay(item.affectedAreas)" :key="group.barangay"
                        class="text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                        <span class="font-semibold flex items-center gap-1.5 text-sm">
                          <LucideMapPin class="h-3.5 w-3.5 text-muted-foreground" />
                          Brgy. {{ group.barangay }}
                        </span>
                        <div v-if="group.streets.length" class="mt-2 pl-6 flex flex-col gap-1">
                          <p v-for="street in group.streets" :key="street"
                            class="text-muted-foreground text-xs relative before:content-[''] before:absolute before:-left-3 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/50">
                            {{ street }}
                          </p>
                        </div>
                        <div v-else class="mt-1 pl-6 text-xs text-muted-foreground/70 italic">
                          All areas/streets affected
                        </div>
                      </div>
                    </div>

                    <!-- Interactive description dropdown -->
                    <details v-else class="group mt-2 bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                      <summary class="cursor-pointer list-none flex items-center justify-between p-3 text-xs font-semibold text-foreground/80 hover:bg-muted/50 transition-colors">
                        <span>View Description</span>
                        <LucideChevronDown class="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div class="p-3 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-border/50 bg-muted/10">
                        {{ item.rawText }}
                      </div>
                    </details>
                  </div>
                </div>
              </template>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <!-- Right column: Map and Reliability Leaderboard -->
      <section class="lg:col-span-7 flex flex-col gap-8">
        <!-- Leaflet Map Container -->
        <Card class="relative overflow-hidden shadow-sm border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader class="px-5 py-4 border-b border-border/50 flex flex-row items-center justify-between bg-muted/20 space-y-0">
            <div>
              <CardTitle class="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Live Interruption Map
              </CardTitle>
              <CardDescription class="text-[11px] mt-1">Interactive overview of active service interruptions</CardDescription>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <div ref="mapElement" class="w-full h-[380px] z-10 relative"></div>
          </CardContent>
        </Card>

        <!-- Municipal Reliability leaderboard -->
        <Card class="flex flex-col shadow-sm border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader class="flex flex-row items-center justify-between border-b border-border/50 px-5 py-4 space-y-0 bg-muted/20">
            <div>
              <CardTitle class="text-sm font-bold tracking-wide uppercase mb-1">
                Reliability Leaderboard
              </CardTitle>
              <CardDescription class="text-[11px]">Ranked by SAIFI & SAIDI coefficients</CardDescription>
            </div>

            <!-- Sorting toggle using Select -->
            <Select v-model="sortAscStr">
              <SelectTrigger class="w-[140px] h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worst" class="text-xs font-medium">Worst First</SelectItem>
                <SelectItem value="best" class="text-xs font-medium">Best First</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent class="p-0">
            <ScrollArea v-if="leaderboard && leaderboard.length" class="h-[320px]">
              <Table>
                <TableHeader class="bg-muted/50 sticky top-0 z-10">
                  <TableRow class="hover:bg-transparent">
                    <TableHead class="w-[60px] text-center text-xs font-semibold uppercase tracking-wider">Rank</TableHead>
                    <TableHead class="text-xs font-semibold uppercase tracking-wider">Municipality</TableHead>
                    <TableHead class="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider">Metrics</TableHead>
                    <TableHead class="text-right text-xs font-semibold uppercase tracking-wider pr-6">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(entry, i) in leaderboard" :key="entry.municipality"
                    @click="focusMunicipality(entry.municipality)"
                    class="cursor-pointer transition-colors hover:bg-muted/50 group">
                    <TableCell class="font-mono text-center text-muted-foreground group-hover:text-foreground transition-colors text-sm">
                      #{{ sortAsc ? i + 1 : leaderboard.length - i }}
                    </TableCell>
                    <TableCell class="font-semibold">
                      {{ entry.municipality }}
                    </TableCell>
                    <TableCell class="hidden sm:table-cell">
                      <div class="flex items-center gap-2 text-xs">
                        <Badge variant="outline" class="font-mono text-[10px] py-0">
                          SAIFI {{ entry.saifiCount?.toFixed(2) }}
                        </Badge>
                        <Badge variant="outline" class="font-mono text-[10px] py-0">
                          SAIDI {{ entry.saidiHours?.toFixed(1) }}h
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell class="text-right pr-6">
                      <div class="flex flex-col items-end gap-1.5 w-full max-w-[100px] ml-auto">
                        <span class="text-xs font-bold font-mono" :class="
                          entry.reliabilityScore >= 95 ? 'text-green-600 dark:text-green-400' :
                          entry.reliabilityScore >= 90 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        ">
                          {{ entry.reliabilityScore?.toFixed(1) }}%
                        </span>
                        <Progress :model-value="entry.reliabilityScore" class="h-1.5 w-full"
                          :class="
                            entry.reliabilityScore >= 95 ? '[&>div]:bg-green-500' :
                            entry.reliabilityScore >= 90 ? '[&>div]:bg-amber-500' :
                            '[&>div]:bg-red-500'
                          " />
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
            
            <div v-else class="flex items-center justify-center h-48 text-muted-foreground text-sm flex-col gap-3">
              <Skeleton class="h-8 w-[90%] rounded-md" v-for="i in 4" :key="i" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
</template>

<style>
/* Leaflet map visual style overrides for shadcn styling */
.leaflet-container {
  background: hsl(var(--muted)) !important;
  font-family: inherit !important;
}

.leaflet-popup-content-wrapper {
  background: #ffffff !important;
  color: #18181b !important;
  border: 1px solid #e4e4e7 !important;
  border-radius: var(--radius) !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15) !important;
  opacity: 1 !important;
}

.leaflet-popup-tip {
  background: #ffffff !important;
  border-top: 1px solid #e4e4e7 !important;
  border-left: 1px solid #e4e4e7 !important;
}

.leaflet-popup-close-button {
  color: #71717a !important;
  padding: 4px !important;
}

/* Base custom scrollbar for better native feel when ScrollArea isn't used */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>
