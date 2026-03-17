import * as Yup from "yup";

export const emailSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required")
});

export const otpSchema = Yup.object({
  otp: Yup.string().matches(/^\d{6}$/, "OTP must be 6 digits").required("OTP is required")
});

export const phoneSchema = Yup.object({
  countryCode: Yup.string().matches(/^\+\d{1,3}$/, "Use +91 format").required("Code is required"),
  phoneNumber: Yup.string().matches(/^\d{6,14}$/, "Invalid phone number").required("Phone is required")
});

export const aadhaarSchema = Yup.object({
  aadhaarNumber: Yup.string().matches(/^\d{12}$/, "Aadhaar must be 12 digits").required("Aadhaar is required")
});

export const credentialsSchema = Yup.object({
  username: Yup.string().min(3).max(30).required("Username is required"),
  password: Yup.string()
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
      "Use uppercase, lowercase, number, special char and 8+ length"
    )
    .required("Password is required")
});

export const MAX_POST_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const ALLOWED_POST_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
];

export function validatePostMediaSelection(fileList) {
  const files = Array.from(fileList || []);
  if (files.length !== 1) {
    return { valid: false, message: "Attach exactly one media file" };
  }

  const file = files[0];
  if (!ALLOWED_POST_MIME_TYPES.includes(file.type)) {
    return { valid: false, message: "Unsupported media type" };
  }
  if (file.size > MAX_POST_FILE_SIZE_BYTES) {
    return { valid: false, message: "File exceeds 50MB limit" };
  }
  return { valid: true, file };
}
