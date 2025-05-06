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

const sendLowStockEmail = async (toEmail, productName, currentStock) => {
  try {
    await transporter.sendMail({
      from: `"Ecommerce Admin" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `⚠️ Low Stock Alert: ${productName}`,
      html: `
      <h3>Hello Vendor,</h3>
      <p>Your product <strong>${productName}</strong> is low on stock.</p>
      <p>Current stock is <strong>${currentStock}</strong>.</p>
      <p>Please restock soon to avoid missing orders.</p>
      <br/>
      <p>Regards,<br/>Ecommerce Platform</p>
    `,
    });
  } catch (error) {
    console.error("Error sending lowStock email:", error);
    throw new Error("Failed to send lowStock email.");
  }
};

export { sendEmail, sendOtpEmail, sendLowStockEmail };
