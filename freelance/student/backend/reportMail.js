// C:\Users\ASUS\OneDrive\Desktop\freelance project\student\backend\reportMail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASS,
  },
});


async function sendStudentReport({ name, email, category, description }) {
  try {
    const mailOptions = {
      from: `"Simplify Reports" <${process.env.ADMIN_EMAIL}>`, // ✅ FIXED
      to: process.env.ADMIN_EMAIL,
      replyTo: email, // ✅ user email goes here
      subject: `New Report from ${name}: ${category}`,
      text: `
A new problem has been reported on Simplify.

Name: ${name}
Email: ${email}
Category: ${category}

Description:
${description}
      `,
      html: `
        <h2>New Problem Reported on Simplify</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Description:</strong></p>
        <p>${description.replace(/\n/g, "<br>")}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return true; // ✅ VERY IMPORTANT
  } catch (err) {
    console.error("❌ Mail send failed:", err.message);
    throw err; // force route to respond with error
  }
}

module.exports = { sendStudentReport };


