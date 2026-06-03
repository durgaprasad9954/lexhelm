"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Users,
  ArrowLeft,
  Send,
  Clock,
  Shield,
  MessageSquare,
  FileText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { submitConsultation } from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const CONSULTATION_TYPES = [
  { value: "general", label: "General Legal Advice", description: "Get answers to general legal questions" },
  { value: "property", label: "Property & Real Estate", description: "Property disputes, agreements, registration" },
  { value: "employment", label: "Employment & Labor", description: "Workplace issues, contracts, termination" },
  { value: "family", label: "Family Law", description: "Marriage, divorce, custody, inheritance" },
  { value: "business", label: "Business & Corporate", description: "Startups, contracts, compliance" },
  { value: "criminal", label: "Criminal Law", description: "FIR, bail, criminal proceedings" },
  { value: "consumer", label: "Consumer Protection", description: "Consumer complaints, refunds, disputes" },
  { value: "civil", label: "Civil Matters", description: "Contracts, damages, civil disputes" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low - Within 1 week", color: "text-emerald-500" },
  { value: "medium", label: "Medium - Within 3 days", color: "text-amber-500" },
  { value: "high", label: "High - Within 24 hours", color: "text-rose-500" },
  { value: "urgent", label: "Urgent - ASAP", color: "text-red-600" },
];

export default function ConsultationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    consultationType: "",
    urgency: "medium",
    subject: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitConsultation({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        consultation_type: formData.consultationType,
        urgency: formData.urgency as "low" | "medium" | "high" | "urgent",
        subject: formData.subject,
        description: formData.description,
      });

      toast.success("Consultation request submitted successfully!");
      setIsSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit consultation request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-gradient-to-br from-indigo-500/5 via-background to-violet-500/5 px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Consultation Request Submitted!</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Our legal team will review your request and get back to you within the specified timeframe.
            </p>

            <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                What happens next?
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-500 shrink-0">1</span>
                  <span>Our team will review your case details</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-500 shrink-0">2</span>
                  <span>You&apos;ll receive an email with consultation options</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-500 shrink-0">3</span>
                  <span>Schedule a call with a qualified legal expert</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href="/documents">
                <Button>Create a Document</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-br from-indigo-500/5 via-background to-violet-500/5 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Start Consultation</h1>
              <p className="text-sm text-muted-foreground">
                Connect with legal experts for personalized advice
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <motion.div variants={container} initial="hidden" animate="show">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Consultation Type */}
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500" />
                      Consultation Type
                    </CardTitle>
                    <CardDescription>
                      Select the area of law you need help with
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CONSULTATION_TYPES.map((type) => (
                        <div
                          key={type.value}
                          onClick={() => setFormData({ ...formData, consultationType: type.value })}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            formData.consultationType === type.value
                              ? "border-indigo-500 bg-indigo-500/5"
                              : "border-border hover:border-indigo-500/30 hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                formData.consultationType === type.value
                                  ? "border-indigo-500"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {formData.consultationType === type.value && (
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <span className="font-medium text-sm">{type.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">{type.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact Information */}
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-500" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>
                      How our legal team can reach you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Urgency & Subject */}
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      Urgency & Subject
                    </CardTitle>
                    <CardDescription>
                      Help us prioritize your consultation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Urgency Level</Label>
                      <div className="flex flex-wrap gap-2">
                        {URGENCY_LEVELS.map((level) => (
                          <Badge
                            key={level.value}
                            variant={formData.urgency === level.value ? "default" : "outline"}
                            className={`cursor-pointer ${
                              formData.urgency === level.value ? "bg-indigo-500" : ""
                            }`}
                            onClick={() => setFormData({ ...formData, urgency: level.value })}
                          >
                            <span className={formData.urgency === level.value ? "" : level.color}>
                              {level.label}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief subject line for your consultation"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Description */}
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      Case Description
                    </CardTitle>
                    <CardDescription>
                      Provide details about your legal matter
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Describe your legal issue in detail. Include relevant dates, parties involved, and any specific questions you have..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      The more details you provide, the better our legal team can prepare for your consultation.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Submit */}
              <motion.div variants={item} className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Your information is kept confidential
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || !formData.consultationType}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
