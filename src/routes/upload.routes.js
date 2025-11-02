import { Router } from "express";
import { createRouteHandler } from "uploadthing/express";

import { ourFileRouter } from "../config/uploadthing.js"; 

const uploadRouter = Router();

// Tạo handler cho Express và gắn nó vào route của bạn
uploadRouter.use(
  "/", // Bạn có thể đặt path cụ thể hơn nếu muốn, ví dụ: "/upload"
  createRouteHandler({
    router: ourFileRouter,
    // config: { ... } // Các config tùy chọn khác nếu cần
  })
);

export default uploadRouter;