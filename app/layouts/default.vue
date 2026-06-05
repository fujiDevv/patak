<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const colorMode = useColorMode()

const toggleColorMode = () => {
  if (colorMode && colorMode.preference !== undefined) {
    colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
  }
}

const isDark = computed(() => colorMode?.value === 'dark')
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
    <!-- Premium Header bar -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
        <NuxtLink to="/" class="flex items-center gap-3">
          <Avatar class="h-9 w-9 border bg-background shadow-sm">
            <AvatarImage src="/favicon.svg" alt="Patak Logo" class="p-1 object-contain" />
            <AvatarFallback>PT</AvatarFallback>
          </Avatar>
          <div class="flex flex-col">
            <h1 class="text-lg font-bold leading-none tracking-tight flex items-center gap-2">
              PATAK
              <Badge variant="secondary" class="h-5 px-1.5 text-[10px] tracking-widest font-semibold uppercase animate-pulse bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">Live</Badge>
            </h1>
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:inline-block">Civic Infrastructure</span>
          </div>
        </NuxtLink>

        <!-- Navigation Links -->
        <nav class="ml-6 flex items-center gap-6 text-sm font-medium">
          <NuxtLink to="/" class="transition-colors hover:text-foreground/80" active-class="text-primary" exact-active-class="text-primary">Dashboard</NuxtLink>
          <NuxtLink to="/about" class="transition-colors hover:text-foreground/80 text-muted-foreground" active-class="text-primary" exact-active-class="text-primary">About</NuxtLink>
        </nav>

        <div class="flex items-center gap-2 ml-auto">
          <!-- Dark Mode Toggle -->
          <Button variant="ghost" size="icon" @click="toggleColorMode" class="h-9 w-9 rounded-full">
            <LucideMoon v-if="isDark" class="h-4 w-4" />
            <LucideSun v-else class="h-4 w-4" />
            <span class="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Content Slot -->
    <main class="flex-1 flex flex-col relative">
      <slot />
    </main>

    <!-- Premium Footer -->
    <footer class="border-t bg-muted/20 py-8 md:py-12 mt-12">
      <div class="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex flex-col items-center md:items-start gap-2">
          <div class="flex items-center gap-2 grayscale opacity-80">
            <Avatar class="h-6 w-6 border bg-background shadow-sm">
              <AvatarImage src="/favicon.svg" alt="Patak Logo" class="p-1 object-contain" />
            </Avatar>
            <span class="text-sm font-bold tracking-wider">PATAK</span>
          </div>
          <p class="text-center text-xs text-muted-foreground md:text-left max-w-xs">
            The civic infrastructure tracker for Metro Manila and beyond. Empowering communities with data.
          </p>
        </div>
        
        <div class="flex gap-6 text-sm text-muted-foreground">
          <NuxtLink to="/" class="hover:underline underline-offset-4">Home</NuxtLink>
          <NuxtLink to="/about" class="hover:underline underline-offset-4">About</NuxtLink>
          <a href="https://github.com/fujiDevv/patak" target="_blank" rel="noreferrer" class="hover:underline underline-offset-4 font-medium text-foreground">GitHub</a>
        </div>
      </div>
      <div class="container mx-auto px-4 md:px-8 mt-8 border-t border-border/50 pt-8 flex items-center justify-center">
        <p class="text-[11px] text-muted-foreground tracking-widest uppercase">
          &copy; {{ new Date().getFullYear() }} Patak Project. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>
