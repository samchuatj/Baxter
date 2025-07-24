"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { BusinessPurpose } from "@/lib/expenses"

interface AddBusinessPurposeFormProps {
  onPurposeAdded: (purpose: BusinessPurpose) => void
  existingPurposes: BusinessPurpose[]
}

export default function AddBusinessPurposeForm({ onPurposeAdded, existingPurposes }: AddBusinessPurposeFormProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a business purpose name",
        variant: "destructive",
      })
      return
    }

    // Check if name already exists (case-insensitive)
    const existingName = existingPurposes.find(
      purpose => purpose.name.toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (existingName) {
      toast({
        title: "Error",
        description: `A business purpose named "${trimmedName}" already exists`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/business-purposes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create business purpose")
      }

      toast({
        title: "Success",
        description: `Business purpose "${trimmedName}" created successfully`,
      })

      onPurposeAdded(data.purpose)
      setName("")
      setIsExpanded(false)
    } catch (error) {
      console.error("Error creating business purpose:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create business purpose",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setName("")
    setIsExpanded(false)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Custom Business Purpose
        </CardTitle>
      </CardHeader>
      
      {!isExpanded ? (
        <CardContent>
          <Button 
            onClick={() => setIsExpanded(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Business Purpose
          </Button>
        </CardContent>
      ) : (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purpose-name">Business Purpose Name</Label>
              <Input
                id="purpose-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing, Office Supplies, Client Entertainment"
                maxLength={100}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-sm text-gray-500">
                {name.length}/100 characters
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isSubmitting || !name.trim()}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Purpose"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
} 