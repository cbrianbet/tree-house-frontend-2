import api from "./client";
import type {
  MovingCompany,
  MovingBooking,
  MovingBookingCreateRequest,
  BookingStatus,
  MovingCompanyReview,
  MovingCompanyReviewCreateRequest,
} from "@/types/api";

export async function listMovingCompanies(): Promise<MovingCompany[]> {
  const res = await api.get<MovingCompany[]>("/api/moving/companies/");
  return res.data;
}

export async function getMovingCompany(id: number): Promise<MovingCompany> {
  const res = await api.get<MovingCompany>(`/api/moving/companies/${id}/`);
  return res.data;
}

export async function listBookings(): Promise<MovingBooking[]> {
  const res = await api.get<MovingBooking[]>("/api/moving/bookings/");
  return res.data;
}

export async function createBooking(
  data: MovingBookingCreateRequest,
): Promise<MovingBooking> {
  const res = await api.post<MovingBooking>("/api/moving/bookings/", data);
  return res.data;
}

export async function updateBookingStatus(
  id: number,
  status: BookingStatus,
  estimated_price?: string,
): Promise<MovingBooking> {
  const body: Record<string, string> = { status };
  if (estimated_price) body.estimated_price = estimated_price;
  const res = await api.put<MovingBooking>(`/api/moving/bookings/${id}/`, body);
  return res.data;
}

export async function listCompanyReviews(
  companyId: number,
): Promise<MovingCompanyReview[]> {
  const res = await api.get<MovingCompanyReview[]>(
    `/api/moving/companies/${companyId}/reviews/`,
  );
  return res.data;
}

export async function createCompanyReview(
  companyId: number,
  data: MovingCompanyReviewCreateRequest,
): Promise<MovingCompanyReview> {
  const res = await api.post<MovingCompanyReview>(
    `/api/moving/companies/${companyId}/reviews/`,
    data,
  );
  return res.data;
}

export async function updateCompanyReview(
  companyId: number,
  reviewId: number,
  data: Partial<MovingCompanyReviewCreateRequest>,
): Promise<MovingCompanyReview> {
  const res = await api.patch<MovingCompanyReview>(
    `/api/moving/companies/${companyId}/reviews/${reviewId}/`,
    data,
  );
  return res.data;
}

export async function deleteCompanyReview(
  companyId: number,
  reviewId: number,
): Promise<void> {
  await api.delete(`/api/moving/companies/${companyId}/reviews/${reviewId}/`);
}
