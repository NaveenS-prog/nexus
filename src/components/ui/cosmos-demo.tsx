"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { ParticleSphere } from "@/components/ui/cosmos-3d-orbit-gallery"
import { Loader2 } from "lucide-react"

interface CosmosDemoProps {
  images?: string[]
  quote?: string
  className?: string
}

const DEFAULT_COSMOS_IMAGES = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=600&auto=format&fit=crop",
]

export function CosmosDemo({ 
  images = DEFAULT_COSMOS_IMAGES,
  quote = "The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself.",
  className = "w-full h-screen bg-black relative"
}: CosmosDemoProps) {
  return (
    <div className={className}>
      {/* Overlay Title */}
      <div className="absolute top-16 sm:top-20 left-0 right-0 z-10 p-6 pointer-events-none">
        <h1 className="max-w-[780px] mx-auto text-white text-center font-instrument-serif px-6 text-3xl sm:text-5xl md:text-6xl text-balance tracking-tight font-normal leading-tight select-none">
          {quote}
        </h1>
        <p className="text-center font-mono text-[11px] text-zinc-400 mt-4 tracking-widest uppercase">
          Drag to rotate • Scroll to zoom • Click & pan
        </p>
      </div>

      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-3 bg-nexus-950">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="font-mono text-xs tracking-wider uppercase">Loading Cosmos 3D Gallery...</span>
        </div>
      }>
        <Canvas camera={{ position: [-10, 1.5, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <ParticleSphere images={images} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </Suspense>
    </div>
  )
}
