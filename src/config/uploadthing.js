import { createUploadthing } from "uploadthing/express";
import jwt from "jsonwebtoken";
import User from "../model/userRepository.js";

const f = createUploadthing();

// Helper function để xác thực token từ request
const authenticateUser = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_KEY);
    return decoded; // Trả về payload của token (ví dụ: { id: '...', role: '...' })
  } catch (error) {
    console.error("Authentication error:", error.message);
    return null;
  }
};

export const ourFileRouter = {
  // Định nghĩa một route mới chuyên cho việc upload avatar
  avatarUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    // Middleware chạy TRƯỚC khi upload để xác thực người dùng
    .middleware(async ({ req }) => {
      // Lấy thông tin người dùng từ token JWT
      const userPayload = authenticateUser(req);

      // Nếu không xác thực được, từ chối upload
      if (!userPayload || !userPayload.id) {
        throw new Error("Unauthorized! You must be logged in to upload an avatar.");
      }
      
      console.log("User authorized for upload:", userPayload.id);

      // Trả về userId để sử dụng trong onUploadComplete
      return { userId: userPayload.id };
    })
    // Callback chạy SAU KHI upload thành công
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      // --- LOGIC CẬP NHẬT DATABASE ---
      // Tìm người dùng bằng ID lấy từ middleware và cập nhật trường 'avatar'
      const updatedUser = await User.findByIdAndUpdate(
        metadata.userId,
        { avatar: file.url, updatedAt: Date.now() }, // Cập nhật URL avatar và updatedAt
        { new: true } // Trả về document đã được cập nhật
      );

      if (!updatedUser) {
        console.error("Could not find user to update avatar for:", metadata.userId);
        // Có thể xử lý thêm ở đây nếu cần
        return;
      }
      
      console.log("Avatar updated successfully for user:", updatedUser.email);
      
      // Dữ liệu này sẽ được trả về cho client sau khi upload thành công
      return { 
        uploadedBy: metadata.userId,
        newAvatarUrl: file.url
      };
    }),
};