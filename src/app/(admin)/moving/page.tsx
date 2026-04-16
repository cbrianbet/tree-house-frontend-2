"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listMovingCompanies,
  listBookings,
  createBooking,
  updateBookingStatus,
  listCompanyReviews,
  createCompanyReview,
} from "@/lib/api/moving";
import type {
  MovingCompany,
  MovingBooking,
  MovingCompanyReview,
  BookingStatus,
} from "@/types/api";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";

import { ROLE_MOVING } from "@/constants/roles";
import PageLoader from "@/components/ui/PageLoader";

const statusColor: Record<string, "warning" | "info" | "success" | "error" | "primary"> = {
  pending: "warning",
  confirmed: "info",
  in_progress: "primary",
  completed: "success",
  cancelled: "error",
};

export default function MovingPage() {
  const { user } = useAuth();
  const isCompany = user?.role === ROLE_MOVING;

  const [companies, setCompanies] = useState<MovingCompany[]>([]);
  const [bookings, setBookings] = useState<MovingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState<"companies" | "bookings">(isCompany ? "bookings" : "companies");
  const [selectedCompany, setSelectedCompany] = useState<MovingCompany | null>(null);
  const [companyReviews, setCompanyReviews] = useState<MovingCompanyReview[]>([]);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, b] = await Promise.all([
          listMovingCompanies().catch(() => []),
          listBookings().catch(() => []),
        ]);
        setCompanies(c);
        setBookings(b);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function openCompany(c: MovingCompany) {
    setSelectedCompany(c);
    try {
      const reviews = await listCompanyReviews(c.id);
      setCompanyReviews(reviews);
    } catch {
      setCompanyReviews([]);
    }
  }

  async function handleBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createBooking({
        company: selectedCompany.id,
        moving_date: fd.get("moving_date") as string,
        moving_time: fd.get("moving_time") as string,
        pickup_address: fd.get("pickup_address") as string,
        delivery_address: fd.get("delivery_address") as string,
        notes: fd.get("notes") as string || undefined,
      });
      setShowBookForm(false);
      const b = await listBookings();
      setBookings(b);
      setSuccess("Booking created.");
    } catch {
      setError("Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createCompanyReview(selectedCompany.id, {
        rating: Number(fd.get("rating")),
        comment: fd.get("comment") as string,
        booking: fd.get("booking") ? Number(fd.get("booking")) : undefined,
      });
      setShowReviewForm(false);
      const reviews = await listCompanyReviews(selectedCompany.id);
      setCompanyReviews(reviews);
      setSuccess("Review submitted.");
    } catch {
      setError("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(bookingId: number, status: BookingStatus, price?: string) {
    setSubmitting(true);
    try {
      await updateBookingStatus(bookingId, status, price);
      const b = await listBookings();
      setBookings(b);
      setSuccess(`Booking ${status}.`);
    } catch {
      setError("Failed to update booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  // Company detail view
  if (selectedCompany) {
    return (
      <div>
        <button onClick={() => setSelectedCompany(null)} className="mb-4 text-sm text-brand-500 hover:text-brand-600">&larr; Back</button>

        {error && <div className="mb-4"><Alert variant="error" title="Error" message={error} /></div>}
        {success && <div className="mb-4"><Alert variant="success" title="" message={success} /></div>}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{selectedCompany.company_name}</h1>
              <div className="mt-1 flex items-center gap-2">
                {selectedCompany.is_verified && <Badge variant="light" size="sm" color="success">Verified</Badge>}
                <span className="text-sm text-yellow-500">{"★".repeat(Math.round(selectedCompany.average_rating))} ({selectedCompany.review_count})</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selectedCompany.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">City:</span> {selectedCompany.city}</div>
                <div><span className="text-gray-400">Phone:</span> {selectedCompany.phone}</div>
                <div><span className="text-gray-400">Base Price:</span> KES {selectedCompany.base_price}</div>
                <div><span className="text-gray-400">Per KM:</span> KES {selectedCompany.price_per_km}</div>
                <div className="col-span-2"><span className="text-gray-400">Areas:</span> {selectedCompany.service_areas.join(", ")}</div>
              </div>
            </div>
            {!isCompany && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowBookForm(!showBookForm)}>{showBookForm ? "Cancel" : "Book"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowReviewForm(!showReviewForm)}>{showReviewForm ? "Cancel" : "Review"}</Button>
              </div>
            )}
          </div>
        </div>

        {showBookForm && (
          <form onSubmit={handleBook} className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="font-semibold text-gray-800 dark:text-white/90">Book This Company</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label>Moving Date</Label><Input name="moving_date" type="date" /></div>
              <div><Label>Moving Time</Label><Input name="moving_time" type="time" /></div>
              <div><Label>Pickup Address</Label><Input name="pickup_address" placeholder="45 Old Town Road" /></div>
              <div><Label>Delivery Address</Label><Input name="delivery_address" placeholder="12 New Estate" /></div>
            </div>
            <div><Label>Notes (optional)</Label><TextArea name="notes" placeholder="Fragile items…" rows={2} /></div>
            <Button size="sm" disabled={submitting}>{submitting ? "Booking…" : "Create Booking"}</Button>
          </form>
        )}

        {showReviewForm && (
          <form onSubmit={handleReview} className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="font-semibold text-gray-800 dark:text-white/90">Write Review</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><Label>Rating (1–5)</Label><Input name="rating" type="number" placeholder="5" /></div>
              <div><Label>Booking ID (optional)</Label><Input name="booking" type="number" placeholder="" /></div>
              <div><Label>Comment</Label><Input name="comment" placeholder="Professional and on time." /></div>
            </div>
            <Button size="sm" disabled={submitting}>{submitting ? "Submitting…" : "Submit Review"}</Button>
          </form>
        )}

        {companyReviews.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Reviews ({companyReviews.length})</h3>
            <div className="space-y-3">
              {companyReviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">{r.reviewer_name}</span>
                    <span className="text-sm text-yellow-500">{"★".repeat(r.rating)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Moving Services</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "companies" ? "primary" : "outline"} onClick={() => setTab("companies")}>Companies</Button>
          <Button size="sm" variant={tab === "bookings" ? "primary" : "outline"} onClick={() => setTab("bookings")}>My Bookings</Button>
        </div>
      </div>

      {error && <div className="mb-4"><Alert variant="error" title="Error" message={error} /></div>}
      {success && <div className="mb-4"><Alert variant="success" title="" message={success} /></div>}

      {tab === "companies" && (
        companies.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-gray-400">No moving companies available.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <button key={c.id} type="button" onClick={() => openCompany(c)} className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">{c.company_name}</h3>
                  {c.is_verified && <Badge variant="light" size="sm" color="success">Verified</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{c.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-yellow-500">{"★".repeat(Math.round(c.average_rating))} ({c.review_count})</span>
                  <span className="text-gray-400">{c.city}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">From KES {c.base_price}</p>
              </button>
            ))}
          </div>
        )
      )}

      {tab === "bookings" && (
        bookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-gray-400">No bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white/90">Booking #{b.id}</span>
                    <span className="ml-2 text-sm text-gray-400">{b.moving_date} at {b.moving_time}</span>
                  </div>
                  <Badge variant="light" size="sm" color={statusColor[b.status] ?? "primary"}>{b.status}</Badge>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>{b.pickup_address} &rarr; {b.delivery_address}</p>
                  {b.estimated_price && <p className="mt-1">Estimated: KES {b.estimated_price}</p>}
                  {b.notes && <p className="mt-1 text-xs text-gray-400">{b.notes}</p>}
                </div>

                {/* Status actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isCompany && b.status === "pending" && (
                    <>
                      <Button size="sm" disabled={submitting} onClick={() => {
                        const price = prompt("Estimated price (optional):");
                        handleStatusChange(b.id, "confirmed", price || undefined);
                      }}>Confirm</Button>
                      <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleStatusChange(b.id, "cancelled")}>Cancel</Button>
                    </>
                  )}
                  {isCompany && b.status === "confirmed" && (
                    <Button size="sm" disabled={submitting} onClick={() => handleStatusChange(b.id, "in_progress")}>Start Move</Button>
                  )}
                  {isCompany && b.status === "in_progress" && (
                    <Button size="sm" disabled={submitting} onClick={() => handleStatusChange(b.id, "completed")}>Complete</Button>
                  )}
                  {!isCompany && (b.status === "pending" || b.status === "confirmed") && (
                    <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleStatusChange(b.id, "cancelled")}>Cancel Booking</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
