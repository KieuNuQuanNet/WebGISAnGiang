const rateLimit = require("express-rate-limit");

// 1. Giới hạn cho Đăng nhập (Chống dò mật khẩu)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 lần thử sai từ 1 địa chỉ IP
  message: {
    message: "Bạn đã thử quá nhiều lần. Vui lòng quay lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Giới hạn cho Quên mật khẩu (Chống Spam Email)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3, // Tối đa 3 lần yêu cầu gửi lại mật khẩu trong 1 giờ
  message: {
    message: "Yêu cầu gửi email quá nhanh. Vui lòng đợi 1 tiếng nữa.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Giới hạn cho Đăng ký (Chống tạo tài khoản ảo hàng loạt)
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 giờ (1 ngày)
  max: 5, // Tối đa 5 tài khoản mới từ 1 IP trong 1 ngày
  message: {
    message: "Bạn đã đạt giới hạn đăng ký trong ngày hôm nay.",
  },
});

module.exports = { loginLimiter, forgotPasswordLimiter, registerLimiter };
