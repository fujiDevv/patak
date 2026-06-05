<template>
  <div class="container mx-auto px-4 md:px-8 py-12 max-w-4xl">
    <div class="space-y-8">
      <div>
        <h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">About Patak</h1>
        <p class="text-xl text-muted-foreground leading-relaxed">
          Patak is an open-source civic infrastructure tracker designed to monitor and visualize power and water service interruptions across the National Capital Region (NCR) and surrounding provinces.
        </p>
      </div>

      <div class="grid gap-8 md:grid-cols-2 mt-8">
        <div class="space-y-4 bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <LucideZap class="h-6 w-6 text-amber-500" /> Power
          </h2>
          <p class="text-muted-foreground">
            We actively monitor maintenance schedules and unannounced emergency outages from local energy providers to keep you informed about grid reliability in your specific municipality.
          </p>
        </div>

        <div class="space-y-4 bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <LucideDroplet class="h-6 w-6 text-blue-500" /> Water
          </h2>
          <p class="text-muted-foreground">
            Water interruptions can heavily impact daily life. Patak aggregates data to give you an overview of ongoing water service issues, helping you prepare accordingly.
          </p>
        </div>
      </div>

      <div class="mt-12 space-y-4 bg-muted/30 p-8 rounded-2xl border border-border/50">
        <h2 class="text-2xl font-bold">Open Source</h2>
        <p class="text-muted-foreground leading-relaxed">
          This project is built by the community, for the community. We believe that civic data should be accessible, transparent, and easy to understand.
        </p>
        <div class="pt-4">
          <a href="https://github.com/fujiDevv/patak" target="_blank" rel="noreferrer" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'About | Patak - Civic Infrastructure Tracker'
})
</script>
