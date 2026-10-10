import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/utiils/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const ISSUE_TYPES = [
  "Network Connectivity and Access",
  "Presentation Submission and Upload",
  "Lounging",
  "Attendance and Academic Records",
  "ID Card Distribution Coordination",
  "Other",
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const issueSchema = z
  .object({
    issue_type: z.string().min(1, "Please select an issue type"),
    other_type: z.string().optional(),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.issue_type === "Other" && (!data.other_type || data.other_type.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify your issue type",
        path: ["other_type"],
      });
    }
  });

type IssueFormValues = z.infer<typeof issueSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface IssueFormProps {
  teamId?: string;
  userName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IssueForm({ teamId, userName }: IssueFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      issue_type: ISSUE_TYPES[0],
      other_type: "",
      title: "",
      description: "",
    },
  });

  const issueTypeValue = form.watch("issue_type");

  const onSubmit = async (data: IssueFormValues) => {
    setIsSubmitting(true);
    try {
      const resolvedType =
        data.issue_type === "Other" && data.other_type?.trim()
          ? `Other: ${data.other_type.trim()}`
          : data.issue_type;

      const response = await apiClient.submitIssue({
        issue_type: resolvedType,
        title: data.title,
        description: data.description,
        user_name: userName,
        team_id: teamId,
      });

      if (!response.success) {
        toast.error(response.message || "Failed to submit issue");
        return;
      }

      toast.success("Issue submitted successfully! Our team will look into it shortly.");
      form.reset();
      setOpen(false);
    } catch (err) {
      toast.error("Something went wrong while submitting the issue.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          id="raise-issue-btn"
          className="m-5 text-black hover:bg-neutral-400 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Raise an Issue
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] bg-[#111111] border border-neutral-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Raise an Issue</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Facing a problem during the hackathon? Let us know and we'll resolve it promptly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

            {/* Issue Type */}
            <FormField
              control={form.control}
              name="issue_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-200">Type of Issue</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="issue-type-select"
                        className="bg-[#1a1a1a] border border-neutral-600 text-white rounded-md"
                      >
                        <SelectValue placeholder="Select an issue type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border border-neutral-600 text-white">
                        {ISSUE_TYPES.map((type) => (
                          <SelectItem
                            key={type}
                            value={type}
                            className="focus:bg-neutral-700 focus:text-white"
                          >
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* "Other" free text — shown only when Other is selected */}
            {issueTypeValue === "Other" && (
              <FormField
                control={form.control}
                name="other_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-200">Specify Issue Type</FormLabel>
                    <FormControl>
                      <Input
                        id="other-issue-type-input"
                        placeholder="Describe your issue type..."
                        className="bg-[#1a1a1a] border border-neutral-600 text-white placeholder:text-neutral-500 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-200">Title</FormLabel>
                  <FormControl>
                    <Input
                      id="issue-title-input"
                      placeholder="Brief summary of the issue"
                      className="bg-[#1a1a1a] border border-neutral-600 text-white placeholder:text-neutral-500 rounded-md"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-200">Description</FormLabel>
                  <FormControl>
                    <textarea
                      id="issue-description-textarea"
                      placeholder="Describe the issue in detail — what happened, when, and where..."
                      rows={4}
                      className="w-full bg-[#1a1a1a] border border-neutral-600 text-white placeholder:text-neutral-500 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-500 transition"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                id="issue-submit-btn"
                disabled={isSubmitting}
                className="bg-white text-black font-semibold hover:bg-neutral-200 transition px-6"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  "Submit Issue"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default IssueForm;
