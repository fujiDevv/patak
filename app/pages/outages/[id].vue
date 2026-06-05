<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { computed } from 'vue'

const route = useRoute()
const outageId = route.params.id

// Fetch details for this outage
const { data: outage, error, pending } = await useFetch(() => `/api/outages/${outageId}`)

const formatDate = (ts: number | null) => {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Generate human-friendly page title
const pageTitle = computed(() => {
  if (!outage.value) return 'Outage Detail | Patak'
  const typeLabel = outage.value.providerSlug === 'meralco' ? 'Power Outage' : 'Water Interruption'
  return `${typeLabel} - ${outage.value.municipality} | Patak`
})

useHead({
  title: pageTitle
})
</script>

<template>
  <div class="container mx-auto px-4 md:px-8 py-8 flex-1 flex flex-col justify-start">
    <!-- Loading State -->
    <div v-if="pending" class="flex flex-col gap-6 py-20 items-center justify-center text-center flex-1">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p class="text-sm text-muted-foreground">Loading outage details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !outage"
      class="py-20 text-center flex flex-col items-center justify-center max-w-md mx-auto flex-1">
      <div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
        <LucideAlertTriangle class="h-6 w-6" />
      </div>
      <h2 class="text-2xl font-bold tracking-tight">Outage Not Found</h2>
      <p class="text-muted-foreground mt-2 text-sm">
        We couldn't retrieve the details for this outage. It may have been resolved, removed, or never existed.
      </p>
      <Button as-child class="mt-6 rounded-full px-6">
        <NuxtLink to="/">Back to Dashboard</NuxtLink>
      </Button>
    </div>

    <!-- Content State -->
    <div v-else class="space-y-6 flex-1 flex flex-col justify-start">
      <!-- Top Actions Bar -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <Button variant="outline" size="sm" as-child class="rounded-full shadow-sm hover:shadow-md transition-all">
          <NuxtLink to="/" class="flex items-center gap-1.5">
            <LucideArrowLeft class="h-4 w-4" />
            Back to Dashboard
          </NuxtLink>
        </Button>
        <span class="text-xs text-muted-foreground font-mono">ID: {{ outage.id }}</span>
      </div>

      <!-- Outage Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5 flex-wrap">
            <Badge variant="secondary"
              class="text-xs px-2.5 font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20">
              {{ outage.providerSlug }}
            </Badge>
            <Badge :variant="outage.status === 'UNANNOUNCED' ? 'destructive' : 'outline'"
              class="text-xs px-2.5 font-semibold">
              {{ outage.status }}
            </Badge>
            <Badge variant="secondary" class="text-xs px-2.5 bg-muted text-muted-foreground">
              {{ outage.reasonCategory }}
            </Badge>
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {{ outage.municipality }}
          </h1>
          <p class="text-sm text-muted-foreground flex items-center gap-1.5">
            <LucideMapPin class="h-4 w-4 text-muted-foreground/70" />
            {{ outage.province }}, {{ outage.region }}
          </p>
        </div>
        <div
          class="bg-card border p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm w-full md:w-36 h-28">
          <span class="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Duration</span>
          <span class="text-3xl font-extrabold text-foreground tracking-tight">{{ outage.durationHours }}</span>
          <span class="text-xs text-muted-foreground font-medium mt-0.5">hours</span>
        </div>
      </div>

      <!-- Outage Details Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left details panel -->
        <div class="lg:col-span-5 space-y-6">
          <Card class="border-border/50 shadow-sm overflow-hidden bg-card/50">
            <CardHeader class="border-b bg-muted/20 px-5 py-4">
              <CardTitle class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LucideClock class="h-3.5 w-3.5 text-muted-foreground" />
                <span>Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="p-5">
              <div class="relative border-l border-border pl-6 ml-3 space-y-6">
                <!-- Start Time -->
                <div class="relative">
                  <span class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background"></span>
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</h4>
                  <p class="text-sm font-semibold text-foreground mt-1">{{ formatDate(outage.startTime) }}</p>
                </div>
                <!-- End Time -->
                <div class="relative">
                  <span class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-zinc-400 ring-4 ring-background"></span>
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Time (Estimated)</h4>
                  <p class="text-sm font-semibold text-foreground mt-1">{{ formatDate(outage.endTime) }}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="border-border/50 shadow-sm overflow-hidden bg-card/50">
            <CardHeader class="border-b bg-muted/20 px-5 py-4">
              <CardTitle class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LucideInfo class="h-3.5 w-3.5 text-muted-foreground" />
                <span>Provider Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="p-5 flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner"
                :class="outage.providerSlug === 'meralco' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'">
                <LucideZap v-if="outage.providerSlug === 'meralco'" class="h-6 w-6" />
                <LucideDroplet v-else class="h-6 w-6" />
              </div>
              <div>
                <h4 class="font-bold text-base capitalize">{{ outage.providerSlug }}</h4>
                <p class="text-xs text-muted-foreground mt-0.5">Utility Provider</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Right details panel -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Affected Areas -->
          <Card class="border-border/50 shadow-sm overflow-hidden">
            <CardHeader class="border-b bg-muted/20 px-5 py-4">
              <CardTitle class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LucideMapPin class="h-3.5 w-3.5 text-muted-foreground" />
                <span>Affected Areas</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="p-5">
              <div v-if="outage.affectedAreas && outage.affectedAreas.length" class="flex flex-col gap-4">
                <div v-for="area in outage.affectedAreas" :key="area.barangay"
                  class="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <span class="font-bold text-sm text-foreground flex items-center gap-1.5 mb-2">
                    <LucideMapPin class="h-4 w-4 text-primary" />
                    Brgy. {{ area.barangay }}
                  </span>
                  <p v-if="area.streetsRaw && area.streetsRaw.trim()"
                    class="text-xs text-muted-foreground leading-relaxed pl-6">
                    {{ area.streetsRaw }}
                  </p>
                  <p v-else class="text-xs text-muted-foreground/70 italic leading-relaxed pl-6">
                    Entire barangay or multiple streets affected
                  </p>
                </div>
              </div>
              <div v-else
                class="flex items-center gap-2 text-sm text-muted-foreground p-4 border border-dashed rounded-xl justify-center bg-muted/10">
                <LucideInfo class="h-4 w-4" />
                No specific barangays mapped. See general description below.
              </div>
            </CardContent>
          </Card>

          <!-- Raw Text / Source Announcement -->
          <Card class="border-border/50 shadow-sm overflow-hidden bg-card/50">
            <CardHeader class="border-b bg-muted/20 px-5 py-4">
              <CardTitle class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LucideFileText class="h-3.5 w-3.5 text-muted-foreground" />
                <span>Source Announcement</span>
              </CardTitle>
            </CardHeader>
            <CardContent class="p-5">
              <blockquote
                class="text-sm italic leading-relaxed text-muted-foreground bg-muted/30 border-l-4 border-primary/40 p-4 rounded-r-xl">
                "{{ outage.rawText }}"
              </blockquote>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
