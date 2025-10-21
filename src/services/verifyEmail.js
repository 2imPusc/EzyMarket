import jwt from 'jsonwebtoken';
import User from '../model/userRepository.js';
import { sendEmail } from '../utils/sendEmail.js';

export const sendVerificationEmail = async (user, req) => {
  const token = jwt.sign({ id: user._id, email: user.email }, process.env.EMAIL_VERIFY_KEY, {
    expiresIn: '1d',
  });
  const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    to: user.email,
    subject: 'Verify your email from EzyMarket',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
  };
  await sendEmail(mailOptions);
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFY_KEY);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(200).json({ message: 'Email already verified' });
    user.emailVerified = true;
    await user.save();
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};
