import { apiClient } from './apiClient';
 
export const memberService = {
  list: (params) => apiClient.get('/members', { params }).then((res) => res.data.data),
 
  getById: (id) => apiClient.get(`/members/${id}`).then((res) => res.data.data),
 
  // Existing head members, for the "Head Member" dropdown on the create/edit form
  getHeadMembers: () => apiClient.get('/members/heads').then((res) => res.data.data),
 
  // Sub-members belonging to a given head, fetched lazily when a head row is expanded
  getSubMembers: (headId) => apiClient.get(`/members/heads/${headId}/sub-members`).then((res) => res.data.data),
 
  // Collection page search box: name/phone/member code -> matched member; center code -> whole group
  collectionSearch: (keyword) => apiClient.get('/members/collection-search', { params: { keyword } }).then((res) => res.data.data),
 
  // Create Member form: every existing profile with this phone number (any status),
  // used to warn about an active duplicate or offer a new loan when all matches are CLOSED
  checkPhoneNumber: (phone) => apiClient.get('/members/check-phone', { params: { phone } }).then((res) => res.data.data),
 
  // Admin page weekday filter: every member (head or sub-member) scheduled for the given weekday
  getByWeekday: (weekday) => apiClient.get(`/members/by-weekday/${weekday}`).then((res) => res.data.data),
 
  // Admin-only: set a member's one-time insurance and processing charges
  updateCharges: (id, payload) => apiClient.put(`/members/${id}/charges`, payload).then((res) => res.data.data),
 
  create: (payload) => apiClient.post('/members', payload).then((res) => res.data.data),
 
  update: (id, payload) => apiClient.put(`/members/${id}`, payload).then((res) => res.data.data),
 
  remove: (id) => apiClient.delete(`/members/${id}`).then((res) => res.data),
 
  closeLoan: (id) => apiClient.put(`/members/${id}/close-loan`).then((res) => res.data.data),
 
  // Member profile "Upload Image" button (Admin-only — Staff/Viewer get a 403 from the
  // backend): multipart upload that ADDS a new nominee photo. Multiple images are
  // supported, so this never replaces an existing one.
  uploadNomineeImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post(`/members/${id}/nominee-images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data);
  },
 
  // Member profile "View Image" gallery: metadata (fileName, uploadedAt, ...) for every
  // nominee photo uploaded for this member. Available to every role.
  getNomineeImages: (id) => apiClient.get(`/members/${id}/nominee-images`).then((res) => res.data.data),
 
  // View/Download a specific nominee photo: fetched as a blob since it needs the auth
  // header (no plain <img src>). Available to every role.
  getNomineeImageBlob: (id, imageId) =>
    apiClient.get(`/members/${id}/nominee-images/${imageId}`, { responseType: 'blob' }).then((res) => res.data),
 
  // Member profile "Delete" action inside the nominee image preview: permanently removes
  // one photo. Admin-only — enforced here (button hidden) and again on the backend
  // (SecurityConfig returns 403 for Staff/Viewer).
  deleteNomineeImage: (id, imageId) =>
    apiClient.delete(`/members/${id}/nominee-images/${imageId}`).then((res) => res.data),
  
  // Member profile "Upload Photo" button (Admin-only — Staff/Viewer get a 403 from the
  // backend): sets/replaces the member's own passport-size photo, used on the print page.
  uploadMemberPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post(`/members/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data);
  },

  // Fetches the member's photo as a blob (for the print page's <img> object URL).
  getMemberPhotoBlob: (id) =>
    apiClient.get(`/members/${id}/photo`, { responseType: 'blob' }).then((res) => res.data),

  // Admin-only: removes the member's photo.
  deleteMemberPhoto: (id) => apiClient.delete(`/members/${id}/photo`).then((res) => res.data),
};
 