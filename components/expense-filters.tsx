"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, FilterIcon, X, Crown, User } from "lucide-react"
import type { BusinessPurpose } from "@/lib/expenses"
import AddBusinessPurposeForm from "./add-business-purpose-form"

export interface FilterValues {
  dateFrom: string
  dateTo: string
  businessPurposeIds: string[]
}

interface ExpenseFiltersProps {
  businessPurposes: BusinessPurpose[]
  onFiltersChange: (filters: FilterValues) => void
  initialFilters?: FilterValues
}

export default function ExpenseFilters({ businessPurposes, onFiltersChange, initialFilters }: ExpenseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(
    initialFilters || {
      dateFrom: "",
      dateTo: "",
      businessPurposeIds: [],
    },
  )

  // Separate default and custom purposes
  const defaultPurposes = businessPurposes.filter(purpose => purpose.is_default)
  const customPurposes = businessPurposes.filter(purpose => !purpose.is_default)

  const handleDateFromChange = (value: string) => {
    const newFilters = { ...filters, dateFrom: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDateToChange = (value: string) => {
    const newFilters = { ...filters, dateTo: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleBusinessPurposeToggle = (purposeId: string, checked: boolean) => {
    const newPurposeIds = checked
      ? [...filters.businessPurposeIds, purposeId]
      : filters.businessPurposeIds.filter((id) => id !== purposeId)

    const newFilters = { ...filters, businessPurposeIds: newPurposeIds }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const newFilters = {
      dateFrom: "",
      dateTo: "",
      businessPurposeIds: [],
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.businessPurposeIds.length > 0

  const getSelectedPurposeNames = () => {
    return businessPurposes
      .filter((purpose) => filters.businessPurposeIds.includes(purpose.id))
      .map((purpose) => purpose.name)
  }

  const getBadgeVariant = (purposeName: string) => {
    switch (purposeName) {
      case "Travel":
        return "default"
      case "Software Subscription":
        return "secondary"
      case "Food":
        return "outline"
      case "Others":
        return "destructive"
      default:
        return "default"
    }
  }

  const handlePurposeAdded = (newPurpose: BusinessPurpose) => {
    // Refresh the business purposes list by triggering a page reload
    // This is a simple approach - in a more complex app, you might want to use a state management solution
    window.location.reload()
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && !isExpanded && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.dateFrom && (
              <Badge variant="outline">From: {new Date(filters.dateFrom).toLocaleDateString()}</Badge>
            )}
            {filters.dateTo && <Badge variant="outline">To: {new Date(filters.dateTo).toLocaleDateString()}</Badge>}
            {getSelectedPurposeNames().map((name) => (
              <Badge key={name} variant={getBadgeVariant(name)}>
                {name}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Filters */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Date Range</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom" className="text-sm">
                    From
                  </Label>
                  <div className="relative">
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleDateFromChange(e.target.value)}
                      className="pl-10"
                    />
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo" className="text-sm">
                    To
                  </Label>
                  <div className="relative">
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleDateToChange(e.target.value)}
                      className="pl-10"
                    />
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Purpose Filters */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Business Purpose</h3>
              
              {/* Default Business Purposes */}
              {defaultPurposes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <Crown className="h-3 w-3" />
                    Default Categories
                  </div>
                  {defaultPurposes.map((purpose) => (
                    <div key={purpose.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={purpose.id}
                        checked={filters.businessPurposeIds.includes(purpose.id)}
                        onCheckedChange={(checked) => handleBusinessPurposeToggle(purpose.id, checked as boolean)}
                      />
                      <Label htmlFor={purpose.id} className="text-sm font-normal cursor-pointer">
                        <Badge variant={getBadgeVariant(purpose.name)} className="ml-1">
                          {purpose.name}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Business Purposes */}
              {customPurposes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <User className="h-3 w-3" />
                    Your Custom Categories
                  </div>
                  {customPurposes.map((purpose) => (
                    <div key={purpose.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={purpose.id}
                        checked={filters.businessPurposeIds.includes(purpose.id)}
                        onCheckedChange={(checked) => handleBusinessPurposeToggle(purpose.id, checked as boolean)}
                      />
                      <Label htmlFor={purpose.id} className="text-sm font-normal cursor-pointer">
                        <Badge variant="outline" className="ml-1">
                          {purpose.name}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Business Purpose Form */}
              <div className="pt-2">
                <AddBusinessPurposeForm 
                  onPurposeAdded={handlePurposeAdded}
                  existingPurposes={businessPurposes}
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
