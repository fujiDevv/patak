<script setup>
import { ref, onMounted, watch } from 'vue'

const searchInput = ref('')
const activeSearch = ref('')
const selectedType = ref('ALL') // 'ALL' | 'POWER' | 'WATER'
const sortAsc = ref(true) // true: lowest score first, false: highest first

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
  'Pateros': [14.5454, 121.0689]
}

useHead({
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
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;900&display=swap'
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
            const color = isEmergency ? '#b91c1c' : (isPower ? '#1e3a8a' : '#3b82f6') // Muted red: Emergency, Deep Blue: Power, Light Blue: Water
            
            const circle = L.circleMarker(coords, {
              radius: 9,
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.25
            })

            const providerEmoji = isPower ? '⚡' : '💧'
            circle.bindPopup(`
              <div class="text-slate-900 font-sans p-1 max-w-[220px]">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-xs">${providerEmoji}</span>
                  <span class="text-[10px] font-medium uppercase tracking-wider text-blue-900">${item.providerSlug}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900">${mName}</h4>
                <p class="text-xs text-slate-500 mt-0.5">${item.reasonCategory} · ${item.durationHours}h duration</p>
                <p class="text-[10px] text-slate-600 mt-1 leading-relaxed line-clamp-3">${item.rawText}</p>
              </div>
            `)

            markersGroup.addLayer(circle)
          }
        })
      })
    }, { immediate: true })
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
    <!-- Header bar -->
    <header class="border-b border-blue-800 bg-blue-900 text-white sticky top-0 z-50 shadow-md">
      <div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-4">
          <img src="/favicon.svg" class="w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm object-contain" alt="Patak Logo" />
          <div>
            <span class="text-xs font-medium tracking-wide uppercase text-blue-200">Civic Infrastructure Tracker</span>
            <h1 class="text-xl font-bold text-white flex items-center gap-2">
              PATAK
              <span class="text-[10px] px-2 py-0.5 bg-blue-800 text-blue-100 rounded-full border border-blue-700 animate-pulse font-medium">LIVE</span>
            </h1>
          </div>
        </div>

        <!-- Search controls -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative w-full md:w-80">
            <input
              v-model="searchInput"
              @keyup.enter="triggerSearch"
              type="text"
              placeholder="Search city (e.g. Quezon City)..."
              class="bg-white border border-slate-200 text-sm focus:border-blue-900 focus:ring-blue-900/10 rounded-xl pl-10 pr-10 py-2.5 w-full transition focus:outline-none focus:ring-2 text-slate-900 placeholder-slate-400 shadow-sm"
            />
            <span class="absolute left-3.5 top-3.5 text-slate-400 text-xs">🔍</span>
            <button 
              v-if="activeSearch" 
              @click="clearSearch" 
              class="absolute right-3 top-2.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs transition"
            >
              ✕
            </button>
          </div>
          <button 
            @click="triggerSearch" 
            class="bg-blue-900 text-white hover:bg-blue-800 font-medium px-5 py-2.5 text-sm rounded-xl shadow-sm transition duration-300"
          >
            Find
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left column: Active outage list -->
      <section class="lg:col-span-5 flex flex-col gap-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="text-xs font-medium tracking-wide uppercase text-slate-500 flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-900 animate-ping"></span>
            Active Outages
          </h2>

          <!-- Type filter buttons -->
          <div class="flex bg-white border border-slate-200 p-0.5 rounded-xl text-xs shadow-sm">
            <button 
              @click="selectedType = 'ALL'"
              :class="selectedType === 'ALL' ? 'bg-blue-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1.5 rounded-lg transition"
            >
              All
            </button>
            <button 
              @click="selectedType = 'POWER'"
              :class="selectedType === 'POWER' ? 'bg-blue-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1.5 rounded-lg transition"
            >
              ⚡ Power
            </button>
            <button 
              @click="selectedType = 'WATER'"
              :class="selectedType === 'WATER' ? 'bg-blue-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1.5 rounded-lg transition"
            >
              💧 Water
            </button>
          </div>
        </div>

        <div v-if="pending" class="py-24 text-center">
          <div class="w-8 h-8 border-4 border-blue-900/20 border-t-blue-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-slate-500 text-xs tracking-wider animate-pulse">Loading outages database...</p>
        </div>

        <div v-else-if="!outages || outages.length === 0" class="p-12 border border-dashed border-slate-200 bg-white rounded-2xl text-center shadow-sm">
          <div class="text-3xl mb-3">🔍</div>
          <p class="text-slate-900 font-bold text-sm mb-1">No interruptions found</p>
          <p class="text-slate-500 text-xs max-w-xs mx-auto">We couldn't find any active water or power outages matching your search query.</p>
        </div>

        <div v-else class="flex flex-col gap-4 overflow-y-auto max-h-[72vh] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          <div
            v-for="item in outages"
            :key="item.id"
            @click="focusMunicipality(item.municipality)"
            class="p-5 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50/10 rounded-xl cursor-pointer transition duration-300 relative overflow-hidden group shadow-sm hover:shadow-md"
          >
            <!-- Provider specific color tag -->
            <div 
              :class="item.providerSlug === 'meralco' ? 'bg-blue-900' : 'bg-blue-500'"
              class="absolute left-0 top-0 bottom-0 w-1"
            ></div>

            <div class="flex justify-between items-center mb-3">
              <span 
                class="text-[9px] font-mono tracking-wider font-extrabold px-2.5 py-0.5 rounded-md uppercase border bg-blue-100 text-blue-800 border-blue-200"
              >
                {{ item.providerSlug }}
              </span>
              <div class="flex items-center gap-2">
                <span class="text-slate-400 text-xs">🕒</span>
                <span class="text-xs text-slate-500 font-medium">{{ item.durationHours }}h duration</span>
              </div>
            </div>

            <h3 class="text-base font-bold text-slate-900 group-hover:text-blue-900 transition">{{ item.municipality }}</h3>
            
            <div class="flex gap-2 items-center mt-1 mb-3">
              <span 
                :class="item.status === 'UNANNOUNCED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'"
                class="text-[10px] font-semibold px-2 py-0.5 rounded border"
              >
                {{ item.status }}
              </span>
              <span class="text-[10px] text-slate-500 font-medium">
                {{ item.reasonCategory }}
              </span>
            </div>

            <!-- Detailed affected areas -->
            <div v-if="item.affectedAreas && item.affectedAreas.length" class="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div v-for="area in item.affectedAreas" :key="area.barangay" class="text-xs">
                <span class="text-slate-800 font-medium">📍 Brgy. {{ area.barangay }}</span>
                <p class="text-slate-500 text-[11px] leading-relaxed mt-0.5 pl-4">{{ area.streetsRaw }}</p>
              </div>
            </div>

            <!-- Fallback text snippet -->
            <p v-else class="text-xs text-slate-600 leading-relaxed mt-2 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">{{ item.rawText }}</p>
          </div>
        </div>
      </section>

      <!-- Right column: Map and Reliability Leaderboard -->
      <section class="lg:col-span-7 flex flex-col gap-8">
        
        <!-- CartoDB Map Container -->
        <div class="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div class="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span class="text-xs font-medium tracking-wide uppercase text-slate-900 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-900"></span>
              Live Interruption Heatmap
            </span>
            <span class="text-[10px] text-slate-500">Leaflet + CartoDB Positron</span>
          </div>
          <div ref="mapElement" class="w-full h-[350px] z-10"></div>
        </div>

        <!-- Municipal Reliability leaderboard -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-xs font-medium tracking-wide uppercase text-slate-900 mb-1">Municipal Reliability Index</h2>
              <p class="text-[10px] text-slate-500">Ranked by SAIFI & SAIDI scoring coefficients</p>
            </div>
            
            <!-- Sorting toggle -->
            <button 
              @click="sortAsc = !sortAsc"
              class="text-xs bg-white border border-blue-200 text-blue-900 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm font-medium"
            >
              <span>Sort:</span>
              <span class="font-bold text-blue-900">{{ sortAsc ? 'Worst First' : 'Best First' }}</span>
            </button>
          </div>

          <div v-if="leaderboard && leaderboard.length" class="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
            <div
              v-for="(entry, i) in leaderboard"
              :key="entry.municipality"
              @click="focusMunicipality(entry.municipality)"
              class="flex items-center gap-4 text-sm p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-200/60 group"
            >
              <!-- Ranking index -->
              <span class="text-slate-400 font-mono w-6 text-center text-xs group-hover:text-slate-600 transition">{{ sortAsc ? i + 1 : leaderboard.length - i }}</span>
              
              <!-- Municipality Name -->
              <span class="flex-1 text-slate-700 font-semibold group-hover:text-slate-900 transition">{{ entry.municipality }}</span>
              
              <!-- Metrics stats -->
              <div class="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                <span class="font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                  SAIFI <strong class="text-slate-800">{{ entry.saifiCount?.toFixed(2) }}</strong>
                </span>
                <span class="font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                  SAIDI <strong class="text-slate-800">{{ entry.saidiHours?.toFixed(1) }}h</strong>
                </span>
              </div>

              <!-- Reliability Gauge Score -->
              <span
                class="text-xs font-mono font-bold px-3 py-1 rounded-full text-right"
                :class="entry.reliabilityScore >= 95
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : entry.reliabilityScore >= 90
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-red-50 text-red-700 border border-red-200'"
              >
                {{ entry.reliabilityScore?.toFixed(1) }}%
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-slate-500 text-center py-8">Calculating index benchmarks...</p>
        </div>
      </section>
    </div>
  </main>
</template>

<style>
/* Leaflet map visual style overrides */
.leaflet-container {
  background: #f8fafc !important;
}
.leaflet-popup-content-wrapper {
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
}
.leaflet-popup-tip {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}
.leaflet-popup-close-button {
  color: #64748b !important;
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
