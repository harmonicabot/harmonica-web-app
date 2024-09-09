"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function NewSessionPage() {
  const [activeTab, setActiveTab] = useState("Create")

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground">
          Sessions
        </Link>{" "}
        &gt; New Session
      </div>
      <div className="flex items-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 mr-2"
        >
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
        <h1 className="text-3xl font-bold">New Session</h1>
      </div>
      <div className="flex space-x-2 mb-6">
        {["Create", "Review", "Share"].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>
      <form className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="sessionName">Session Name*</Label>
          <Input
            id="sessionName"
            placeholder="e.g. Team Brainstorm"
            required
          />
          <p className="text-sm text-muted-foreground">
            This will be shared with your participants
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">What is the goal of your template?*</Label>
          <Textarea
            id="goal"
            placeholder="I want to understand..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="critical">
            What is critical for you to understand or gather?*
          </Label>
          <Textarea
            id="critical"
            placeholder="What peoples opinion is of the topic"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="context">What context is required to help</Label>
          <Textarea
            id="context"
            placeholder="Acme Co. is a company that does.."
          />
        </div>
        <div className="space-y-2">
          <Label>Advanced</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select advanced options" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between">
          <Button variant="outline">Back</Button>
          <Button type="submit">Next</Button>
        </div>
      </form>
    </div>
  )
}