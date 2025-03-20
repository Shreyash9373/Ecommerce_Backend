import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service (e.g., Outlook, SMTP)
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password or App Password
  },
});
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Email sent successfully to", to);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendOtpEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Admin OTP Verification",
      html: `<h2>Your OTP for login is <b>${otp}</b></h2> <p>This OTP will expire in 5 minutes.</p>`,
    });

    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email.");
  }
};

export { sendEmail, sendOtpEmail };
