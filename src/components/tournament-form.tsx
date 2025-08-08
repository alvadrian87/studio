"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import type { SuggestTournamentSettingsOutput } from "@/ai/flows/suggest-tournament-settings"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react"
import { suggestTournamentSettings } from "@/ai/flows/suggest-tournament-settings"

const formSchema = z.object({
  tournamentName: z.string().min(2, {
    message: "Tournament name must be at least 2 characters.",
  }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format.",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  format: z.enum(['Single Elimination', 'Double Elimination', 'Round Robin']),
  numberOfPlayers: z.coerce.number().int().positive(),
  entryFee: z.coerce.number().min(0),
  prizePoolDistribution: z.string().min(10, {
    message: "Prize pool distribution details must be at least 10 characters.",
  }),
  rules: z.string().min(20, {
    message: "Rules must be at least 20 characters long.",
  }),
})

export function TournamentForm() {
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState<SuggestTournamentSettingsOutput | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "EvoLadder Summer Cup",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0],
      location: "Online",
      format: "Single Elimination",
      numberOfPlayers: 16,
      entryFee: 10,
      prizePoolDistribution: "1st: 60%, 2nd: 30%, 3rd: 10%",
      rules: "Standard tournament rules apply. All matches are best of 3.",
    },
  })

  async function onSuggest() {
    const values = form.getValues()
    const validation = formSchema.safeParse(values)
    if (!validation.success) {
      form.trigger()
      return
    }

    setLoading(true)
    setAiResult(null)
    try {
      const result = await suggestTournamentSettings(validation.data)
      setAiResult(result)
    } catch (error) {
      console.error("AI suggestion failed:", error)
      // You can add a toast notification here for the error
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    // Here you would typically send the data to your backend to create the tournament
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="tournamentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Summer Smash Open" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City Tennis Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tournament format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Single Elimination">Single Elimination</SelectItem>
                      <SelectItem value="Double Elimination">Double Elimination</SelectItem>
                      <SelectItem value="Round Robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Players</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entryFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry Fee ($)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="prizePoolDistribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prize Pool Distribution</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe how the prize pool will be distributed..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rules</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the tournament rules..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {aiResult && (
            <Alert variant={aiResult.isValid ? "default" : "destructive"}>
              {aiResult.isValid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{aiResult.isValid ? "Configuration looks good!" : "Potential Issues Found"}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{aiResult.reason}</p>
                {aiResult.suggestions.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1">
                    {aiResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onSuggest} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              AI Suggestions
            </Button>
            <Button type="submit">Create Tournament</Button>
          </div>
        </form>
      </Form>
    </>
  )
}
