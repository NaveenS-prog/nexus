"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CosmosDemo } from "@/components/ui/cosmos-demo"
import { Button } from "@/components/ui/button"

export default function CosmosPage() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Back button overlay */}
      <div className="absolute top-4 left-4 z-20">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="bg-black/60 backdrop-blur-md border-white/20 text-zinc-200 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>

      <CosmosDemo />
    </div>
  )
}
