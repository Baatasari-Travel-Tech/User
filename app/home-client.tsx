'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { getRoleDashboard, getRoleOnboarding } from '@/lib/roles'
import Hero from "@/components/about/hero"
import Features from "@/components/about/features"
import { SiteFooter } from "@/components/site-footer"
import EventOrganizer from "@/components/about/organizer"
import RestaurantOwner from "@/components/about/restaurant-owner"
import Performers from "@/components/about/performers"
import CampusAmbassador from "@/components/about/campus-ambassador"
import CtaBand from "@/components/about/cta-band"
import Marquee from "@/components/about/marquee"

export default function HomeClient() {
    const router = useRouter()
    const { session, activeRole, userRoles, organizerVerificationStatus, isLoading } = useAuth()

    const homeHref = useMemo(() => {
        if (!session?.user) return '/'

        const activeRoleRecord = userRoles.find((record) => record.role === activeRole)
        const userRoleRecord = userRoles.find((record) => record.role === 'USER')
        const organizerRoleRecord = userRoles.find((record) => record.role === 'EVENT_ORGANIZER')

        if (activeRole === 'EVENT_ORGANIZER') {
            const organizerOnboarded = organizerRoleRecord?.onboarding_completed === true
            if (!organizerOnboarded) return getRoleOnboarding('EVENT_ORGANIZER')
            if (organizerVerificationStatus === 'EMAIL_NOT_VERIFIED') return '/organizer/email-verification'
            if (organizerVerificationStatus === 'DOCUMENTS_REQUIRED') return '/organizer/document-upload'
            if (organizerVerificationStatus !== 'APPROVED') return '/organizer/pending'
            return getRoleDashboard('EVENT_ORGANIZER')
        }

        if (activeRole === 'USER') {
            return userRoleRecord?.onboarding_completed ? '/events' : '/onboarding'
        }

        return activeRoleRecord?.onboarding_completed
            ? getRoleDashboard(activeRole)
            : getRoleOnboarding(activeRole)
    }, [session?.user, activeRole, userRoles, organizerVerificationStatus])

    useEffect(() => {
        if (isLoading) return
        if (session?.user && homeHref && homeHref !== '/') {
            router.replace(homeHref)
        }
    }, [isLoading, session?.user, homeHref, router])

    // Only logged-in users are blanked (they're being redirected to their
    // dashboard — avoids a marketing-page flash). Everyone else — logged-out
    // visitors AND anyone while auth is still resolving — gets the marketing
    // content IMMEDIATELY. Previously this returned null during `isLoading`,
    // which left marketing links blank until the client-side auth check
    // round-tripped to the API. That was the main "site is slow" complaint.
    if (session?.user && homeHref !== '/') {
        return null
    }

    return (
        <main className="min-h-screen">
            <Hero />
            <Marquee />
            <CtaBand />
            <Features />
            <EventOrganizer />
            <RestaurantOwner />
            <CampusAmbassador />
            <Performers />
            <SiteFooter />
        </main>
    )
}
