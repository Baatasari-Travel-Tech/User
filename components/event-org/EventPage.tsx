"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";

import EventForm from "./EventForm";
import TicketingForm from "./TicketingForm";
import SponsorshipForm from "./SponsorshipForm";
import FinalForm from "./FinalForm";
import CoverImageCropper from "./CoverImageCropper";

import {
  INITIAL_EVENT_FORM_DATA,
  STEP_FIELDS,
  PROGRESS_STEPS,
  EventFormData,
} from "./data//create-event-data";

import { validateEventForm } from "./validateEventform";

const stepFields = STEP_FIELDS;

interface EventPageProps {
  isDashboardMode?: boolean;
  startDirectly?: boolean;
  action?: string | null;
  contactInfoPrefill?: Partial<EventFormData["contactInfo"]>;
  // Existing cover URL to show in the preview when editing an event.
  initialCoverPreview?: string | null;
  onSubmit?: (formData: EventFormData) => Promise<void>;
  // Publishing preference (create flow only): lifted to the page so the
  // submit handler can send `published: publishMode === "publish"`.
  publishMode?: "publish" | "draft";
  onPublishModeChange?: (mode: "publish" | "draft") => void;
  showPublishingPreferences?: boolean;
}

const SCROLL_OFFSET = 100;

/**
 * The saved draft, read from localStorage exactly once.
 *
 * Called from a useState initialiser rather than an effect so the restored
 * values are in the FIRST painted frame. Restoring in an effect meant the user
 * saw an empty form and then watched it fill in, and it is the cascading render
 * that react-hooks/set-state-in-effect flags.
 *
 * Guarded on `window`: this component also renders on the server, where
 * localStorage does not exist. Every parse is wrapped — a corrupted draft
 * should start a blank form, never crash the page an organizer needs.
 */
function readSavedDraft(action: string | null): {
  hasDraft: boolean;
  data: Partial<EventFormData>;
  sections: Record<string, boolean> | null;
} {
  const empty = { hasDraft: false, data: {}, sections: null };
  if (typeof window === "undefined") return empty;

  let data: Partial<EventFormData> = {};
  let hasDraft = false;
  try {
    const raw = localStorage.getItem("eventFormData");
    if (raw) {
      data = JSON.parse(raw) as Partial<EventFormData>;
      hasDraft = true;
      // Rescheduling or repeating reuses everything EXCEPT when it happens.
      // Carrying the old dates over is how you publish an event for a date
      // that has already passed.
      if (action === "reschedule" || action === "repeat") {
        data = { ...data, date: "", endDate: "", time: "", endTime: "" };
      }
    }
  } catch {
    data = {};
    hasDraft = false;
  }

  let sections: Record<string, boolean> | null = null;
  try {
    const raw = localStorage.getItem("eventFormOpenSections");
    if (raw) sections = JSON.parse(raw) as Record<string, boolean>;
  } catch {
    sections = null;
  }

  return { hasDraft, data, sections };
}

function getScrollContainer(
  target: HTMLElement | null,
  mainContainerRef: React.RefObject<HTMLDivElement | null>,
  isDashboardMode: boolean
): HTMLElement | Window {
  if (isDashboardMode) {
    // In dashboard mode, scroll directly on window since the main element
    // doesn't have overflow: auto and isn't the actual scroll container
    return window;
  }

  if (mainContainerRef.current) return mainContainerRef.current;

  // Fallback to window
  return window;
}

// Calculate absolute scrollTop target in the container's coordinate system
function getTargetScrollTop(container: HTMLElement | Window, target: HTMLElement, offset = 0) {
  if (container === window) {
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    return Math.max(0, y);
  }

  const el = container as HTMLElement;

  // target position in viewport + current container scroll - container top in viewport
  const y =
    target.getBoundingClientRect().top -
    el.getBoundingClientRect().top +
    el.scrollTop -
    offset;

  return Math.max(0, y);
}

// Custom smooth scroll using RAF for consistent animation
function smoothScrollTo(container: HTMLElement | Window, top: number, duration = 600) {
  const start = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
  const distance = top - start;
  if (Math.abs(distance) < 2) return;

  let startTime: number | null = null;

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (time: number) => {
    if (startTime === null) startTime = time;
    const progress = Math.min(1, (time - startTime) / duration);
    const y = start + distance * easeInOutCubic(progress);

    if (container === window) {
      window.scrollTo(0, y);
    } else {
      (container as HTMLElement).scrollTop = y;
    }

    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

const EventPage: React.FC<EventPageProps> = ({
  isDashboardMode = false,
  startDirectly = false,
  action = null,
  contactInfoPrefill,
  initialCoverPreview = null,
  onSubmit,
  publishMode = "publish",
  onPublishModeChange,
  showPublishingPreferences = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem("eventFormCurrentStep");
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) return parsed;
      }
    }
    return 1;
  });
  // Read the saved draft ONCE, lazily, the same way currentStep above does.
  //
  // This used to happen in a mount effect that called setFormData,
  // setOpenSections and setShowCreateEvent. That painted an empty form first
  // and the restored draft second — a visible flash of blank fields on every
  // resume — and it is the cascading render react-hooks/set-state-in-effect
  // exists to catch. A lazy initialiser runs before the first paint instead.
  //
  // Guarded on `window`: this component renders on the server too, where
  // localStorage does not exist.
  const savedDraft = useState(() => readSavedDraft(action))[0];

  const [showCreateEvent, setShowCreateEvent] = useState(
    // Auto-resume: a saved draft means skip the "Get Started" screen, which the
    // mount effect used to do a frame late.
    startDirectly || savedDraft.hasDraft,
  );

  // `startDirectly` is a prop and can flip after mount. Adjusted during render
  // rather than in an effect — React's documented "adjust state when a prop
  // changes" — so the transition is applied before paint, not after.
  const [syncedStartDirectly, setSyncedStartDirectly] = useState(startDirectly);
  if (startDirectly !== syncedStartDirectly) {
    setSyncedStartDirectly(startDirectly);
    if (startDirectly) setShowCreateEvent(true);
  }

  const [formData, setFormData] = useState<EventFormData>(() => ({
    ...INITIAL_EVENT_FORM_DATA,
    ...savedDraft.data,
  }));
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialCoverPreview);
  const [photoError, setPhotoError] = useState("");
  const [coverCropSource, setCoverCropSource] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState(() => ({
    "event-info": true,
    "date-time": true,
    "event-highlights": true,
    ticketing: true,
    sponsorship: true,
    audience: true,
    guidelines: true,
    addOns: true,
    // Spread last so a saved layout wins, and anything the saved copy predates
    // still gets its default rather than coming back undefined.
    ...savedDraft.sections,
  }));
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof openSections],
    }));
  };

  const progressSteps = PROGRESS_STEPS.map((step, index) => ({
    ...step,
    active: currentStep >= index + 1,
  }));

  const formRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // The draft used to be restored here, in a mount effect. It is now read once
  // by readSavedDraft() and fed into the useState initialisers above, so the
  // first painted frame already has it.

  // Fill empty contact fields from the organizer's profile when the prefill
  // arrives. Adjusted during render on a change of the prop, rather than in an
  // effect — same trigger as the old `[contactInfoPrefill]` dependency, but
  // applied before paint instead of after, so the fields never visibly fill
  // themselves in a frame later.
  //
  // The updater below still only writes when something actually changes and
  // never overwrites a field the organizer has typed into, which is what makes
  // running it during render safe: it is idempotent.
  const [syncedContactPrefill, setSyncedContactPrefill] = useState(contactInfoPrefill);
  if (contactInfoPrefill !== syncedContactPrefill) {
    setSyncedContactPrefill(contactInfoPrefill);
    if (contactInfoPrefill) applyContactPrefill();
  }

  function applyContactPrefill() {
    if (!contactInfoPrefill) return;

    setFormData((prev) => {
      const current = prev.contactInfo ?? {
        mobile: "",
        email: "",
        website: "",
        additionalLinks: "",
      };

      const next = {
        mobile: current.mobile?.trim() ? current.mobile : (contactInfoPrefill.mobile?.trim() ?? current.mobile),
        email: current.email?.trim() ? current.email : (contactInfoPrefill.email?.trim() ?? current.email),
        website: current.website?.trim() ? current.website : (contactInfoPrefill.website?.trim() ?? current.website),
        additionalLinks: current.additionalLinks?.trim()
          ? current.additionalLinks
          : (contactInfoPrefill.additionalLinks?.trim() ?? current.additionalLinks),
      };

      if (
        next.mobile === current.mobile &&
        next.email === current.email &&
        next.website === current.website &&
        next.additionalLinks === current.additionalLinks
      ) {
        return prev;
      }

      return {
        ...prev,
        contactInfo: next,
      };
    });
  }

  // Persist form data (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem("eventFormData", JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(t);
  }, [formData]);

  useEffect(() => {
    localStorage.setItem("eventFormCurrentStep", currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("eventFormOpenSections", JSON.stringify(openSections));
  }, [openSections]);

  // When the form becomes visible, scroll to it once (reliable)
  useLayoutEffect(() => {
    if (!showCreateEvent) return;
    if (!formRef.current) return;

    const container = getScrollContainer(formRef.current, mainContainerRef, isDashboardMode);
    const top = getTargetScrollTop(container, formRef.current, SCROLL_OFFSET);

    // Slight delay helps when CSS/layout transitions exist
    requestAnimationFrame(() => {
      smoothScrollTo(container, top, 450);
    });
  }, [showCreateEvent, isDashboardMode]);

  const handleGetStarted = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setShowCreateEvent(true);
  };

  const handleStepClick = (targetStep: number) => {
    // Free navigation: jump to ANY step without validating the current one.
    // Required fields are enforced only on the final submit (see handleNext).
    setCurrentStep(targetStep);
    setFormErrors({});
    setSubmitError(null);
    setTimeout(scrollToFormTop, 0);
  };

  const scrollToFirstError = (errors: Record<string, string>) => {
    if (Object.keys(errors).length === 0) return;

    // Expand every collapsible section so a collapsed one can't hide the field.
    setOpenSections((prev) => ({
      ...prev,
      "event-info": true,
      "date-time": true,
      "event-highlights": true,
      ticketing: true,
      sponsorship: true,
      audience: true,
      guidelines: true,
      addOns: true,
    }));

    const focusFirstError = () => {
      // Error messages all render with `.text-danger-red` directly beside their
      // field, in DOM order — so the first one is the first invalid field.
      const msg = document.querySelector<HTMLElement>(".text-danger-red");
      if (!msg) return;

      const field = msg.closest<HTMLElement>(".relative") ?? msg.parentElement ?? msg;
      field.scrollIntoView({ behavior: "smooth", block: "center" });

      const control = field.querySelector<HTMLElement>(
        "input:not([type='file']):not([type='hidden']), select, textarea"
      );
      if (control) {
        try { control.focus({ preventScroll: true }); } catch {}
      }
    };

    // Wait for any step switch / section expansion to render before measuring.
    requestAnimationFrame(() => setTimeout(focusFirstError, 120));
  };

  const scrollToFormTop = () => {
    if (!formRef.current) return;
    const container = getScrollContainer(formRef.current, mainContainerRef, isDashboardMode);
    const top = getTargetScrollTop(container, formRef.current, SCROLL_OFFSET);
    smoothScrollTo(container, top, 350);
  };

  const handleNext = async () => {
    if (isSubmitting) return;

    // Steps 1–3: "Proceed" just advances. No per-step validation gate — the
    // organizer can move between steps freely and fill them in any order.
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      setFormErrors({});
      setSubmitError(null);
      setTimeout(scrollToFormTop, 0);
      return;
    }

    // Step 4 = Submit: validate EVERYTHING. If anything required is missing,
    // jump to the first step (by hierarchy) that has an error and focus the
    // first invalid field there.
    {
      const errors = validateEventForm(formData);
      setFormErrors(errors);
      setSubmitError(null);
      setSubmitSuccess(null);

      if (Object.keys(errors).length > 0) {
        const errorFields = Object.keys(errors);
        let jumpStep = 1;
        for (let i = 0; i < stepFields.length; i++) {
          if (errorFields.some((field) => stepFields[i].some((key) => field === key || field.startsWith(`${key}.`)))) {
            jumpStep = i + 1;
            break;
          }
        }
        const count = Object.keys(errors).length;
        setSubmitError(`${count} required field${count > 1 ? "s are" : " is"} incomplete. Please fix the highlighted fields before submitting.`);
        setCurrentStep(jumpStep);
        scrollToFirstError(errors);
        return;
      }

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(formData);
          localStorage.removeItem("eventFormData");
          localStorage.removeItem("eventFormCurrentStep");
          localStorage.removeItem("eventFormOpenSections");
          setSubmitSuccess("Event submitted successfully.");
        } catch (submitErr) {
          setSubmitError(submitErr instanceof Error ? submitErr.message : "Event submission failed.");
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      localStorage.removeItem("eventFormData");
      localStorage.removeItem("eventFormCurrentStep");
      localStorage.removeItem("eventFormOpenSections");
      setSubmitSuccess("Form submitted.");
      return;
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      setTimeout(scrollToFormTop, 0);
    }
  };

  const updateNestedState = <T extends object,>(
    prevState: T,
    path: string[],
    value: unknown
  ): T => {
    const [head, ...tail] = path;
    const obj = prevState as Record<string, unknown>;
    if (tail.length === 0) return { ...obj, [head]: value } as unknown as T;

    return {
      ...obj,
      [head]: updateNestedState((obj[head] as object) || {}, tail, value),
    } as unknown as T;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    const files = target.files;

    if (name === "eventPhoto") {
      const file = files?.[0];
      if (file) {
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!validTypes.includes(file.type)) {
          setPhotoError("Please upload a JPG, PNG, GIF, or WEBP file.");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setPhotoError("File size must be less than 5MB.");
          return;
        }
        setPhotoError("");
        // Open the cropper so the organizer frames the cover to the exact ratio
        // that's stored and shown everywhere, instead of a blind center-crop.
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") setCoverCropSource(reader.result);
        };
        reader.readAsDataURL(file);
      }
      // Reset the input so re-selecting the same file re-opens the cropper.
      target.value = "";
      return;
    }

    if (name.startsWith("transport.") || name.startsWith("addOns.")) {
      const path = name.split(".");
      setFormData((prev) => updateNestedState(prev, path, checked));
      return;
    }

    const path = name.split(".");
    setFormData((prev) =>
      updateNestedState(prev, path, type === "checkbox" ? checked : value)
    );
  };

  const addArrayItem = (arrayName: string) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: [
        ...(prev[arrayName as keyof EventFormData] as Record<string, unknown>[]),
        arrayName === "artists"
          ? { name: "", genre: "" }
          : arrayName === "chefGuests"
            ? { name: "", specialty: "" }
            : arrayName === "attractions"
              ? { name: "", description: "" }
              : arrayName === "audienceCategory"
                ? { category: "", numberOfTickets: "", isLimited: true, isFree: false, price: "", description: "" }
                : arrayName === "timeSlots"
                  ? { name: "", startTime: "", endTime: "" }
                  : { name: "", logo: null, details: "" },
      ],
    }));
  };

  const updateArrayField = (arrayName: string, index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: (prev[arrayName as keyof EventFormData] as Record<string, unknown>[]).map(
        (item, i) => (i === index ? { ...item, [field]: value } : item)
      ),
    }));
  };

  const removeArrayItem = (arrayName: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: (
        (prev[arrayName as keyof EventFormData] as Record<string, unknown>[]) || []
      ).filter((_, i) => i !== index),
    }));
  };

  return (
    <div
      ref={mainContainerRef}
      className={`flex flex-col w-full bg-[#fdfaf5] ${isDashboardMode
          ? "h-auto overflow-y-visible rounded-3xl"
          : "h-screen overflow-y-auto"
        }`}
    >
      <div className="grow">
        <section
          className={`flex flex-col items-center gap-13 w-full min-h-screen ${isDashboardMode ? "min-h-0!" : ""
            }`}
        >
          <div className="flex flex-col items-start gap-13 w-full">
            {!startDirectly && (
              <section className="flex flex-col items-start justify-center gap-6 py-15 px-25 w-full bg-white max-xl:py-10 max-xl:px-[4vw] max-[700px]:py-6 max-[700px]:px-[2vw] max-[700px]:min-h-0 max-[480px]:py-4 max-[480px]:px-2">
                <h1 className="font-semibold text-upcoming-primary-700 text-[52px] leading-[62.4px] m-0 font-[Poppins,Helvetica,sans-serif] max-[900px]:text-[32px] max-[900px]:leading-10 max-[700px]:text-[22px] max-[700px]:leading-7 max-[480px]:text-[32px] max-[480px]:leading-[1.2]">
                  Promote Your Event with Baatasari
                </h1>

                <div className="flex items-center gap-6 w-full max-xl:flex-col max-xl:gap-8 max-[900px]:flex-col max-[900px]:gap-6">
                  <div className="flex flex-col items-start gap-10 flex-1 min-w-70 max-xl:w-full max-xl:max-w-[100vw]">
                    <p className="w-full max-w-152 font-medium text-gray-600 text-lg leading-normal m-0 font-[Poppins,Helvetica,sans-serif] max-[480px]:text-[15px] max-[480px]:leading-normal max-[480px]:max-w-full">
                      Are you an event planner eager to highlight amazing talent? Look no further than
                      Baatasari — the perfect blend of creativity and opportunity!
                      <br />
                      In just 5 minutes, you can complete our form, making sure every detail is tailored
                      to your needs. Let us assist you in connecting with the ideal performers and
                      audiences.
                    </p>

                    <p className="font-medium text-foreground text-base leading-6 m-0 font-[Outfit,Helvetica,sans-serif] max-[480px]:text-[15px] max-[480px]:leading-normal">
                      Become part of our dynamic community and let your event shine at thrilling
                      gatherings, live shows, and tailored showcases.
                      <br />
                      Ready to elevate your event? Just take 5 minutes to complete the form below — our
                      team will reach out to ensure you&apos;re fully prepared. Your event deserves the
                      spotlight. Let&apos;s create something extraordinary!
                    </p>

                    <a href="#create" onClick={handleGetStarted} className="inline-flex items-center justify-center gap-4 py-3 px-8 bg-upcoming-primary-900 rounded-[30px] text-white cursor-pointer border-none no-underline">
                      <span className="font-medium text-base leading-normal font-[Poppins,Helvetica,sans-serif]">Get Started</span>
                      <ChevronDownIcon className="w-6 h-6" />
                    </a>
                  </div>

                  <div className="flex items-start justify-center px-8 pb-12.5 flex-1 min-w-70 max-xl:w-full max-xl:max-w-[100vw] max-[480px]:hidden">
                    <div className="w-full max-w-99.75 h-100 rounded-4xl flex items-center justify-center flex-col" style={{ position: "relative", background: "transparent", padding: 0 }}>
                      <Image
                        src="/event_hero_landing.png"
                        alt="Event celebration with crowd and stage"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        style={{ objectFit: "cover", borderRadius: "20px" }}
                        priority
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {showCreateEvent && (
            <div
              id="create"
              ref={formRef}
              className="flex flex-col w-full max-w-310 items-center gap-8 px-4 py-6 sm:px-6 sm:py-8 scroll-mt-25 max-[480px]:px-3 max-[480px]:gap-6"
              aria-hidden={!showCreateEvent}
            >
              <div className="flex flex-col items-center gap-7 w-full">
                <div className="flex items-center justify-between w-full">
                  <h2 className="font-bricolage font-bold text-2xl sm:text-3xl text-(--brand-navy) m-0 inline-flex items-center gap-2">
                    Create Event
                    <SparklesIcon className="h-5 w-5 text-(--gold)" aria-hidden="true" />
                  </h2>
                </div>

                <div
                  className="relative w-full max-w-250 flex items-start justify-between gap-1.5 sm:gap-2"
                  role="progressbar"
                  aria-label={`Event creation progress, step ${currentStep} of 4`}
                >
                  {progressSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const done = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    const active = step.active;

                    return (
                      <React.Fragment key={step.number}>
                        <div
                          className="flex flex-col items-center z-2 cursor-pointer"
                          onClick={() => handleStepClick(Number(step.number))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") handleStepClick(Number(step.number));
                          }}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ${active
                                ? "bg-(--gold) text-white"
                                : "bg-white border border-slate-300 text-slate-400"
                              }`}
                          >
                            {done ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : stepNumber}
                          </div>

                          <span
                            className={`mt-2 text-center text-[11px] max-w-24 wrap-break-word ${isCurrent
                                ? "text-(--gold-text) font-bold"
                                : "text-slate-400 max-[480px]:hidden"
                              }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        {index < progressSteps.length - 1 && (
                          <div className="h-px bg-slate-200 flex-1 z-1 mt-[18px] min-w-4" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="w-full">
                {currentStep === 1 && (
                  <EventForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    photoPreview={photoPreview}
                    setPhotoPreview={setPhotoPreview}
                    photoError={photoError}
                    setPhotoError={setPhotoError}
                    addArrayItem={addArrayItem}
                    updateArrayField={updateArrayField}
                    removeArrayItem={removeArrayItem}
                    openSections={openSections}
                    toggleSection={toggleSection}
                    formErrors={formErrors}
                  />
                )}

                {currentStep === 2 && (
                  <TicketingForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    addArrayItem={addArrayItem}
                    updateArrayField={updateArrayField}
                    removeArrayItem={removeArrayItem}
                    openSections={openSections}
                    toggleSection={toggleSection}
                    formErrors={formErrors}
                  />
                )}

                {currentStep === 3 && (
                  <SponsorshipForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    openSections={openSections}
                    toggleSection={toggleSection}
                    formErrors={formErrors}
                  />
                )}

                {currentStep === 4 && (
                  <FinalForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    formErrors={formErrors}
                    publishMode={publishMode}
                    onPublishModeChange={onPublishModeChange}
                    showPublishingPreferences={showPublishingPreferences}
                    coverPreview={photoPreview}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreateEvent && (
        <div className="flex justify-center py-2 px-4 sm:px-[7%]">
          <div className="w-full max-w-200 mt-8 pb-25 max-[480px]:pb-20">
            {submitError ? (
              <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
            ) : null}
            {submitSuccess ? (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{submitSuccess}</p>
            ) : null}
            <div className="flex justify-between items-start w-full gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSubmitting}
              className={`inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-bold text-slate-700 cursor-pointer transition hover:bg-slate-50 active:scale-[0.98] ${currentStep === 1
                  ? "cursor-not-allowed invisible"
                  : ""
                }`}
            >
              <ArrowLeftIcon size={16} />
              Previous
            </button>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => void handleNext()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-7 py-3 text-sm font-bold text-white cursor-pointer transition hover:bg-(--brand-navy)/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Submitting..."
                  : currentStep === 4
                    ? showPublishingPreferences
                      ? publishMode === "publish"
                        ? "Publish Event"
                        : "Save Draft"
                      : "Submit"
                    : "Proceed"}
                <ArrowRightIcon size={16} />
              </button>
              {currentStep === 1 ? (
                <p className="m-0 text-[11px] text-slate-400">You can review and publish in the next step.</p>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      )}

      {coverCropSource ? (
        <CoverImageCropper
          source={coverCropSource}
          onCancel={() => setCoverCropSource(null)}
          onApply={(file, previewUrl) => {
            setFormData((prev) => ({ ...prev, eventPhoto: file, hasStoredCover: true }));
            setPhotoPreview(previewUrl);
            setPhotoError("");
            setCoverCropSource(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default EventPage;
