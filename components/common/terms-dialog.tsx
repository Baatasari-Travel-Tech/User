"use client";

import { type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TermsDialogProps {
  children: ReactNode;
}

export function TermsDialog({ children }: TermsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl gap-0 overflow-hidden rounded-3xl border border-(--gray-200) bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-(--gray-100) px-7 pt-6 pb-4 text-left">
          <DialogTitle className="font-bricolage text-2xl font-bold text-(--brand-navy)">
            Terms &amp; Conditions
          </DialogTitle>
          <DialogDescription className="text-sm text-(--gray-500)">
            Please review before confirming your booking.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-7 py-5 text-sm leading-7 text-(--gray-700)">
          <p className="mb-4">
            Welcome to <strong>Baatasari Platform</strong>. By accessing or
            using our platform, you agree to comply with and be bound by the
            following terms.
          </p>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            1. Eligibility
          </h3>
          <p className="mb-3">
            You must be at least 18 years old to use this platform. By
            registering, you confirm that the information provided is accurate
            and complete.
          </p>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            2. User Accounts
          </h3>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            <li>You are responsible for maintaining account confidentiality.</li>
            <li>You agree not to share login credentials.</li>
            <li>You are responsible for all activities under your account.</li>
          </ul>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            3. General User Responsibilities
          </h3>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            <li>Browse and register for events responsibly.</li>
            <li>Provide accurate profile and preference information.</li>
            <li>Do not misuse platform features or submit harmful content.</li>
          </ul>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            4. Payments &amp; Refunds
          </h3>
          <p className="mb-3">
            Each event is either <strong>refundable</strong> or{" "}
            <strong>non-refundable</strong>; this is shown on the event page and
            at checkout. If the organizer or Baatasari cancels an event, you get
            a full refund. On a refundable event you can cancel your order until
            2 hours before it starts and get the ticket price back minus a
            cancellation charge that depends on how close the event is; the
            platform fee and the payment-gateway charge are not refunded.
            Baatasari acts only as a facilitator and is not responsible for
            disputes between attendees and organizers. Read the full{" "}
            <a href="/refund-policy" className="underline">Refund Policy</a>.
          </p>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            5. Event Bookings
          </h3>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            <li>Tickets cannot be exchanged. Refunds follow the event&apos;s refund setting (see section 4).</li>
            <li>
              An internet handling fee per ticket may be levied. Please check
              the final amount before payment.
            </li>
            <li>
              We recommend arriving at least 20 minutes before event start time.
            </li>
            <li>Rights of admission reserved.</li>
          </ul>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            6. Prohibited Activities
          </h3>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            <li>Fraudulent registrations or payments</li>
            <li>Uploading misleading or illegal content</li>
            <li>Violating applicable laws</li>
          </ul>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            7. Platform Rights
          </h3>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            <li>We may suspend or terminate accounts.</li>
            <li>We may modify features without prior notice.</li>
          </ul>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            8. Limitation of Liability
          </h3>
          <p className="mb-3">
            Baatasari is not liable for any direct or indirect damages arising
            from platform usage, event participation, or organizer actions.
          </p>

          <h3 className="mt-5 mb-2 text-base font-semibold text-(--brand-navy)">
            9. Changes to Terms
          </h3>
          <p className="mb-3">
            We reserve the right to update these terms at any time. Continued
            use after changes constitutes acceptance.
          </p>

          <p className="mt-6 text-xs text-(--gray-500)">
            This is a short summary. The full{" "}
            <a href="/terms-and-conditions" className="underline">Terms &amp; Conditions</a>,{" "}
            <a href="/privacy-policy" className="underline">Privacy Policy</a> and{" "}
            <a href="/refund-policy" className="underline">Refund Policy</a> apply.
            Last updated: October 2026.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
