"use client";


import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileCheck2, Landmark, Sparkles, Stamp, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface RentalAgreementFormValues {
  [key: string]: string;
}

interface RentalAgreementIntakeProps {
  onGenerate: (values: RentalAgreementFormValues) => Promise<void>;
  onCancel?: () => void;
  generating?: boolean;
}

type FieldDefinition = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
};

const STAMP_OPTIONS = ["10", "20", "50", "100"];
const STAMP_IMAGES: Record<string, string> = {
  "10": "/stamps/non-judicial-10.png",
  "20": "/stamps/non-judicial-20.png",
  "50": "/stamps/non-judicial-50.png",
  "100": "/stamps/non-judicial-100.png",
};

const DOCUMENT_FORMATS = [
  {
    value: "residential_standard",
    title: "Residential Rent Agreement",
    description: "Best for flats, houses, and family tenancy.",
  },
  {
    value: "room_rental",
    title: "Room Rental Agreement",
    description: "For shared accommodation and single-room occupancy.",
  },
  {
    value: "house_lease",
    title: "Independent House Lease",
    description: "For villas, stand-alone houses, and longer lease terms.",
  },
  {
    value: "commercial_basic",
    title: "Commercial Lease Format",
    description: "For shops, offices, and small business premises.",
  },
];

const FIELD_SECTIONS = [
  {
    title: "Stamp and Format",
    description: "Choose the exact stamp value and layout to apply on the agreement.",
    fields: [
      { name: "state", label: "State", type: "text", required: true, placeholder: "Tamil Nadu" },
      { name: "stamp_amount", label: "Stamp Amount", type: "select", required: true, options: STAMP_OPTIONS },
      { name: "document_format", label: "Document Format", type: "select", required: true, options: DOCUMENT_FORMATS.map((item) => item.value) },
      { name: "reference_doc_label", label: "Reference Label", type: "text", required: false, placeholder: "Residential Rental Agreement" },
    ],
  },
  {
    title: "Party Information",
    description: "Collect the landlord and tenant identity details exactly as they should appear in the agreement.",
    fields: [
      { name: "landlord_name", label: "Landlord Full Name", type: "text", required: true },
      { name: "landlord_address", label: "Landlord Address", type: "textarea", required: true },
      { name: "landlord_adhar_no", label: "Landlord Aadhaar No", type: "text", required: true },
      { name: "tenant_name", label: "Tenant Full Name", type: "text", required: true },
      { name: "tenant_address", label: "Tenant Address", type: "textarea", required: true },
      { name: "tenant_adhar_no", label: "Tenant Aadhaar No", type: "text", required: true },
    ],
  },
  {
    title: "Property Information",
    description: "Describe the rental property clearly so it can be identified without ambiguity.",
    fields: [
      { name: "property_address", label: "Property Address", type: "textarea", required: true },
      { name: "property_type", label: "Property Type", type: "select", required: true, options: ["Apartment", "House", "Condo", "Room", "Commercial", "Other"] },
      { name: "number_of_bedrooms", label: "Number of Bedrooms", type: "text", required: true, placeholder: "2" },
      { name: "number_of_bathrooms", label: "Number of Bathrooms", type: "text", required: true, placeholder: "2" },
    ],
  },
  {
    title: "Lease Terms",
    description: "Set the term, renewal rules, and dates for the tenancy.",
    fields: [
      { name: "lease_type", label: "Lease Type", type: "select", required: true, options: ["Fixed Lease", "Month-to-Month"] },
      { name: "lease_start_date", label: "Lease Start Date", type: "text", required: true, placeholder: "15 June 2026" },
      { name: "lease_end_date", label: "Lease End Date", type: "text", required: false, placeholder: "14 May 2027" },
      { name: "lease_duration_months", label: "Lease Duration in Months", type: "text", required: false, placeholder: "11" },
      { name: "renewal_option_allowed", label: "Renewal Option Allowed", type: "select", required: true, options: ["Yes", "No"] },
    ],
  },
  {
    title: "Rent and Utilities",
    description: "Capture the rent payment and utility responsibility terms.",
    fields: [
      { name: "monthly_rent", label: "Monthly Rent Amount", type: "text", required: true, placeholder: "25000" },
      { name: "rent_due_date", label: "Rent Due Date", type: "text", required: true, placeholder: "5" },
      { name: "security_deposit", label: "Security Deposit Amount", type: "text", required: true, placeholder: "50000" },
      { name: "electricity_paid_by", label: "Electricity Paid By", type: "select", required: true, options: ["Landlord", "Tenant"] },
      { name: "water_paid_by", label: "Water Paid By", type: "select", required: true, options: ["Landlord", "Tenant"] },
    ],
  },
  {
    title: "Occupancy and Alterations",
    description: "Only needed for room rentals where occupancy and alteration rules must be explicit.",
    fields: [
      { name: "minimum_number_of_occupants", label: "Minimum Number of Occupants", type: "text", required: false },
      { name: "subletting_allowed", label: "Subletting Allowed", type: "select", required: true, options: ["Yes", "No"] },
      { name: "subletting_terms", label: "Subletting Terms", type: "textarea", required: false },
      { name: "guest_policy_description", label: "Guest Policy Description", type: "textarea", required: false },
      { name: "alterations_allowed", label: "Alterations Allowed", type: "select", required: true, options: ["Yes", "No"] },
      { name: "alteration_approval_process", label: "Alteration Approval Process", type: "textarea", required: false },
      { name: "painting_allowed", label: "Painting Allowed", type: "select", required: true, options: ["Yes", "No"] },
      { name: "nails_and_holes_policy", label: "Nails and Holes Policy", type: "textarea", required: false },
    ],
  },
  {
    title: "Insurance and Termination",
    description: "Cover insurance requirements, notice periods, and early termination terms.",
    fields: [
      { name: "renters_insurance_required", label: "Renter's Insurance Required", type: "select", required: true, options: ["Yes", "No"] },
      { name: "minimum_coverage_amount", label: "Minimum Coverage Amount", type: "text", required: false },
      { name: "landlord_insurance_policy_details", label: "Landlord Insurance Policy Details", type: "textarea", required: false },
      { name: "notice_required_to_terminate", label: "Notice Required to Terminate (Days)", type: "text", required: true, placeholder: "30" },
      { name: "early_termination_fee", label: "Early Termination Fee", type: "text", required: false },
      { name: "early_termination_penalty_description", label: "Early Termination Penalty Description", type: "textarea", required: false },
      { name: "notice_required_for_renewal", label: "Notice Required for Renewal (Days)", type: "text", required: false },
      { name: "auto_renewal_terms", label: "Auto-Renewal Terms", type: "textarea", required: false },
    ],
  },
  {
    title: "Additional Clauses",
    description: "Keep extra policies minimal and only expand them when smoking is allowed.",
    fields: [
      { name: "smoking_allowed", label: "Smoking Allowed", type: "select", required: false, options: ["Yes", "No"] },
      { name: "drug_policy_description", label: "Drug Policy Description", type: "textarea", required: false },
      { name: "criminal_activity_policy", label: "Criminal Activity Policy", type: "textarea", required: false },
      { name: "legal_use_of_premises_policy", label: "Legal Use of Premises Policy", type: "textarea", required: false },
      { name: "assignment_transfer_policy", label: "Assignment/Transfer Policy", type: "textarea", required: false },
      { name: "move_out_condition_requirements", label: "Move-Out Condition Requirements", type: "textarea", required: false },
      { name: "cleaning_deposit_required", label: "Cleaning Deposit Required", type: "select", required: false, options: ["Yes", "No"] },
      { name: "cleaning_deposit_amount", label: "Cleaning Deposit Amount", type: "text", required: false },
    ],
  },
  {
    title: "Document Metadata and Signing",
    description: "Finish with signing details, jurisdiction, language, and versioning.",
    fields: [
      { name: "agreement_date", label: "Agreement Date", type: "text", required: true, placeholder: "13 June 2026" },
      { name: "jurisdiction", label: "Jurisdiction", type: "text", required: true, placeholder: "Tamil Nadu, India" },
      { name: "agreement_language", label: "Agreement Language", type: "select", required: true, options: ["English", "Spanish", "Other"] },
      { name: "document_version_number", label: "Document Version Number", type: "text", required: false, placeholder: "1.0" },
      { name: "landlord_signature", label: "Landlord Signature", type: "text", required: true, placeholder: "Landlord name or signatory line" },
      { name: "witness_signature", label: "Witness Signature", type: "text", required: false, placeholder: "Witness name or signatory line" },
    ],
  },
];

const STEP_TITLE_MAP: Record<string, string> = {
  "Stamp and Format": "Stamp & Format",
  "Party Information": "Party Details",
  "Property Information": "Property",
  "Lease Terms": "Lease Terms",
  "Rent and Utilities": "Rent & Utilities",
  "Occupancy and Alterations": "Room Rules",
  "Insurance and Termination": "Insurance & Exit",
  "Additional Clauses": "Policies",
  "Document Metadata and Signing": "Signing",
};

const INITIAL_VALUES: RentalAgreementFormValues = {
  state: "",
  stamp_amount: "10",
  document_format: "residential_standard",
  reference_doc_label: "Residential Rental Agreement",
  landlord_name: "",
  landlord_address: "",
  landlord_adhar_no: "",
  tenant_name: "",
  tenant_address: "",
  tenant_adhar_no: "",
  property_address: "",
  property_type: "Apartment",
  number_of_bedrooms: "",
  number_of_bathrooms: "",
  lease_type: "Fixed Lease",
  lease_start_date: "",
  lease_end_date: "",
  lease_duration_months: "",
  renewal_option_allowed: "Yes",
  monthly_rent: "",
  rent_due_date: "5",
  security_deposit: "",
  electricity_paid_by: "Tenant",
  water_paid_by: "Tenant",
  minimum_number_of_occupants: "",
  subletting_allowed: "No",
  subletting_terms: "",
  guest_policy_description: "",
  alterations_allowed: "No",
  alteration_approval_process: "",
  painting_allowed: "No",
  nails_and_holes_policy: "",
  renters_insurance_required: "No",
  minimum_coverage_amount: "",
  landlord_insurance_policy_details: "",
  notice_required_to_terminate: "30",
  early_termination_fee: "",
  early_termination_penalty_description: "",
  notice_required_for_renewal: "",
  auto_renewal_terms: "",
  smoking_allowed: "No",
  drug_policy_description: "",
  criminal_activity_policy: "",
  legal_use_of_premises_policy: "",
  assignment_transfer_policy: "",
  move_out_condition_requirements: "",
  cleaning_deposit_required: "No",
  cleaning_deposit_amount: "",
  agreement_date: "",
  jurisdiction: "",
  agreement_language: "English",
  document_version_number: "1.0",
  landlord_signature: "",
  witness_signature: "",
};

const REQUIRED_FIELDS = new Set(
  FIELD_SECTIONS.flatMap((section) => section.fields.filter((field) => field.required).map((field) => field.name)),
);

function prettyLabel(fieldName: string) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSelectionLabel(value: string) {
  const option = DOCUMENT_FORMATS.find((item) => item.value === value);
  return option?.title ?? value;
}

function isNumericField(fieldName: string) {
  return [
    "adhar",
    "rent",
    "deposit",
    "bedrooms",
    "bathrooms",
    "occupants",
    "notice",
    "fee",
    "coverage_amount",
    "cure_notice",
    "breach_notice",
    "duration_months",
    "stamp_amount",
  ].some((token) => fieldName.includes(token));
}

const CONDITIONAL_FIELDS: Record<string, string[]> = {
  renewal_option_allowed: ["notice_required_for_renewal", "auto_renewal_terms"],
  subletting_allowed: ["subletting_terms"],
  alterations_allowed: ["alteration_approval_process"],
  painting_allowed: ["nails_and_holes_policy"],
  renters_insurance_required: ["minimum_coverage_amount", "landlord_insurance_policy_details"],
  cleaning_deposit_required: ["cleaning_deposit_amount"],
};

function shouldShowField(fieldName: string, values: RentalAgreementFormValues) {
  for (const [controller, dependents] of Object.entries(CONDITIONAL_FIELDS)) {
    if (dependents.includes(fieldName)) {
      return values[controller] === "Yes";
    }
  }
  if (fieldName === "lease_end_date" || fieldName === "lease_duration_months") {
    return values.lease_type === "Fixed Lease";
  }
  if (
    [
      "minimum_number_of_occupants",
      "subletting_allowed",
      "subletting_terms",
      "guest_policy_description",
      "alterations_allowed",
      "alteration_approval_process",
      "painting_allowed",
      "nails_and_holes_policy",
    ].includes(fieldName)
  ) {
    return values.property_type === "Room";
  }
  if (
    [
      "drug_policy_description",
      "criminal_activity_policy",
      "legal_use_of_premises_policy",
      "assignment_transfer_policy",
      "move_out_condition_requirements",
      "cleaning_deposit_required",
      "cleaning_deposit_amount",
    ].includes(fieldName)
  ) {
    return values.smoking_allowed === "Yes";
  }
  return true;
}

function StampPreview({ amount }: { amount: string }) {
  const stampSrc = STAMP_IMAGES[amount] ?? STAMP_IMAGES["10"];
  return (
    <div className="w-full rounded-[1.5rem] border border-border bg-white p-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stampSrc}
        alt={`Non-judicial stamp paper Rs.${amount}`}
        className="w-full rounded-[1rem] object-contain"
      />
    </div>
  );
}

function getVisibleSections(values: RentalAgreementFormValues) {
  return FIELD_SECTIONS.filter((section) => section.title !== "Occupancy and Alterations" || values.property_type === "Room");
}

function getStepFields(sectionFields: FieldDefinition[], values: RentalAgreementFormValues) {
  return sectionFields.filter((field) => shouldShowField(field.name, values));
}

export function RentalAgreementIntake({
  onGenerate,
  onCancel,
  generating = false,
}: RentalAgreementIntakeProps) {
  const [values, setValues] = useState<RentalAgreementFormValues>(INITIAL_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const missingRequiredFields = useMemo(
    () => Object.keys(values).filter((field) => REQUIRED_FIELDS.has(field) && !values[field]?.trim()),
    [values],
  );
  const visibleSections = useMemo(() => getVisibleSections(values), [values]);
  const totalSteps = visibleSections.length + 1;

  const updateValue = (field: string, value: string) => {
    if (field.includes("adhar")) {
      value = value.replace(/\D+/g, "").slice(0, 12);
    }
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field in CONDITIONAL_FIELDS && value === "No") {
        for (const dependent of CONDITIONAL_FIELDS[field]) {
          next[dependent] = "";
        }
      }
      if (field === "lease_type" && value !== "Fixed Lease") {
        next.lease_end_date = "";
        next.lease_duration_months = "";
      }
      if (field === "property_type" && value !== "Room") {
        next.minimum_number_of_occupants = "";
        next.subletting_allowed = "No";
        next.subletting_terms = "";
        next.guest_policy_description = "";
        next.alterations_allowed = "No";
        next.alteration_approval_process = "";
        next.painting_allowed = "No";
        next.nails_and_holes_policy = "";
      }
      if (field === "smoking_allowed" && value !== "Yes") {
        next.drug_policy_description = "";
        next.criminal_activity_policy = "";
        next.legal_use_of_premises_policy = "";
        next.assignment_transfer_policy = "";
        next.move_out_condition_requirements = "";
        next.cleaning_deposit_required = "No";
        next.cleaning_deposit_amount = "";
      }
      return next;
    });
  };

  const isStepComplete = (stepIndex: number) => {
    if (stepIndex >= visibleSections.length) {
      return missingRequiredFields.length === 0;
    }
    const stepFields = getStepFields(visibleSections[stepIndex].fields as FieldDefinition[], values);
    return stepFields.every((field) => !field.required || values[field.name]?.trim());
  };

  const stepHasErrors = (stepIndex: number) => {
    if (stepIndex >= visibleSections.length) {
      return submitted && missingRequiredFields.length > 0;
    }
    const stepFields = getStepFields(visibleSections[stepIndex].fields as FieldDefinition[], values);
    return submitted && stepFields.some((field) => field.required && !values[field.name]?.trim());
  };

  const canNavigateToStep = (stepIndex: number) => {
    if (stepIndex <= activeStep) return true;
    if (stepIndex === visibleSections.length) {
      return visibleSections.every((_, index) => isStepComplete(index));
    }
    return Array.from({ length: stepIndex }).every((_, index) => isStepComplete(index));
  };

  const getFirstIncompleteStep = () => {
    const firstIncompleteIndex = visibleSections.findIndex((_, index) => !isStepComplete(index));
    return firstIncompleteIndex === -1 ? totalSteps - 1 : firstIncompleteIndex;
  };

  const goNext = () => {
    setSubmitted(true);
    if (activeStep < visibleSections.length && !isStepComplete(activeStep)) {
      return;
    }
    setActiveStep((current) => Math.min(current + 1, totalSteps - 1));
  };

  const goPrevious = () => {
    setActiveStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (missingRequiredFields.length > 0) {
      setActiveStep(getFirstIncompleteStep());
      return;
    }
    await onGenerate(values);
  };

  const renderField = (field: FieldDefinition) => {
    const hasError = submitted && field.required && !values[field.name]?.trim();
    const sharedClassName = hasError
      ? "border-primary/50 bg-white focus-visible:ring-primary/20"
      : "border-border bg-white focus-visible:ring-primary/15";

    return (
      <div
        key={field.name}
        className={field.type === "textarea" ? "space-y-2" : "space-y-2"}
      >
        <label className="block text-sm font-medium text-foreground">
          {field.label}
          {field.required ? <span className="ml-1 text-primary">*</span> : null}
        </label>
        {field.type === "textarea" ? (
          <Textarea
            rows={4}
            value={values[field.name] ?? ""}
            onChange={(event) => updateValue(field.name, event.target.value)}
            placeholder={field.placeholder}
            className={`resize-y rounded-2xl px-4 py-3 ${sharedClassName}`}
          />
        ) : field.type === "select" ? (
          <Select value={values[field.name] ?? ""} onValueChange={(value) => updateValue(field.name, value)}>
            <SelectTrigger className={`h-12 rounded-2xl px-4 ${sharedClassName}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {field.name === "document_format" ? formatSelectionLabel(option) : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={values[field.name] ?? ""}
            onChange={(event) => updateValue(field.name, event.target.value)}
            inputMode={isNumericField(field.name) ? "numeric" : undefined}
            placeholder={field.placeholder}
            maxLength={field.name.includes("adhar") ? 12 : undefined}
            className={`h-12 rounded-2xl px-4 ${sharedClassName}`}
          />
        )}
        {hasError ? (
          <p className="text-xs text-primary">{field.label} is required.</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-background p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
              <Stamp className="h-3.5 w-3.5" />
              Guided Rental Agreement
            </div>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-foreground">
              Collect every lease detail in one clean intake instead of a back-and-forth bot chat.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This flow follows your rental agreement checklist, lets the user choose the exact non-judicial stamp image, and keeps the generated document aligned with the stamp-paper references you shared.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Landmark, label: "Stamp options", value: "Rs.10 / 20 / 50 / 100" },
                { icon: FileText, label: "Reference styles", value: "Residential, room, house, commercial" },
                { icon: FileCheck2, label: "Structured intake", value: "Sequential checkout-style steps" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <item.icon className="h-4 w-4 text-foreground" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px] border-t border-border/60 bg-background p-4 lg:border-l lg:border-t-0 flex flex-col items-center justify-center gap-4">
            <div className="absolute right-6 top-6 rounded-full bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm z-10">
              Stamp Preview
            </div>
            <div className="w-full max-w-[640px] rounded-[1.75rem] border border-border bg-white p-4 shadow-[0_18px_45px_rgba(65,92,164,0.08)]">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                Non-Judicial Stamp Reference
              </p>
              <StampPreview amount={values.stamp_amount} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Selected Stamp Value: Rs.{values.stamp_amount}</p>
            {/* Stamp quick selectors */}
            <div className="flex gap-2 flex-wrap justify-center">
              {STAMP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => updateValue('stamp_amount', amount)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    values.stamp_amount === amount
                      ? 'bg-[#415CA4] text-white border-[#415CA4] shadow-sm'
                      : 'bg-card text-foreground border-border hover:border-[#415CA4]/40'
                  }`}
                >
                  Rs.{amount}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Agreement workflow</CardTitle>
              <CardDescription>
                Complete one step at a time, then review everything before generating the document.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {missingRequiredFields.length === 0 ? "All required details are ready" : `${missingRequiredFields.length} required fields left`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const active = index === activeStep;
              const completed = index < activeStep && isStepComplete(index);
              const title = index < visibleSections.length ? STEP_TITLE_MAP[visibleSections[index].title] : "Review";
              return (
                <button
                  key={`${title}-${index}`}
                  type="button"
                  onClick={() => {
                    if (canNavigateToStep(index)) {
                      setActiveStep(index);
                      return;
                    }
                    setSubmitted(true);
                  }}
                  disabled={!canNavigateToStep(index)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    active
                      ? "border-primary bg-[#F3F5FA] shadow-sm"
                      : canNavigateToStep(index)
                        ? "border-border bg-white hover:border-primary/25 hover:bg-[#F3F5FA]/60"
                        : "border-border/70 bg-white/70 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                      completed
                        ? "border-primary bg-primary text-white"
                        : active
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white text-muted-foreground"
                    }`}>
                      {completed ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className={`text-xs ${stepHasErrors(index) ? "text-primary" : "text-muted-foreground"}`}>
                        {completed ? "Completed" : active ? "Current step" : "Pending"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeStep < visibleSections.length ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Card className="border-border/60 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">{visibleSections[activeStep].title}</CardTitle>
                  <CardDescription>{visibleSections[activeStep].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {getStepFields(visibleSections[activeStep].fields as FieldDefinition[], values).map(renderField)}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-[#F3F5FA] shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step summary</CardTitle>
                  <CardDescription>
                    {activeStep + 1} of {totalSteps}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-medium text-foreground">
                    {visibleSections[activeStep].title}
                  </p>
                  <p className="text-muted-foreground">
                    {getStepFields(visibleSections[activeStep].fields as FieldDefinition[], values).filter((field) => field.required && !values[field.name]?.trim()).length === 0
                      ? "All required inputs for this step are complete."
                      : "Complete the required inputs in this step to continue."}
                  </p>
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Selected setup
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatSelectionLabel(values.document_format)} on Rs.{values.stamp_amount} stamp paper
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Card className="border-border/60 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Review</CardTitle>
                  <CardDescription>Check all entered details before generating the rental agreement.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {visibleSections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-border bg-[#F3F5FA] p-4">
                      <p className="text-sm font-semibold text-foreground">{section.title}</p>
                      <div className="mt-3 space-y-2">
                        {getStepFields(section.fields as FieldDefinition[], values).map((field) => (
                          <div key={field.name}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{field.label}</p>
                            <p className="text-sm text-foreground">{values[field.name]?.trim() || "Not provided"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-[#F3F5FA] shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ready to generate</CardTitle>
                  <CardDescription>Final check before document generation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {missingRequiredFields.length === 0 ? (
                    <p className="text-sm text-primary">All required rental agreement details are complete.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Missing: {missingRequiredFields.map(prettyLabel).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step actions</CardTitle>
          <CardDescription>
            Move through the workflow like a checkout stepper and finish on the review tab before generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {activeStep < visibleSections.length
              ? `Current step: ${visibleSections[activeStep].title}`
              : "Current step: Review"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={goPrevious} disabled={activeStep === 0 || generating} className="rounded-xl px-5">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {activeStep < totalSteps - 1 ? (
              <Button onClick={goNext} disabled={generating} className="rounded-xl px-5">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={generating} className="rounded-xl px-5">
                {generating ? "Generating..." : "Generate Rental Agreement"}
              </Button>
            )}
            <Button
              onClick={() => {
                setSubmitted(true);
                setActiveStep(getFirstIncompleteStep());
              }}
              disabled={generating}
              className="rounded-xl px-5"
            >
              Go to Review
            </Button>
            {onCancel ? (
              <Button variant="outline" onClick={onCancel} disabled={generating} className="rounded-xl px-5">
                Back to AI drafting
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
