// C:\Users\ASUS\OneDrive\Desktop\freelance project\student\backend\reportMail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,      // e.g. simplifyorg12@gmail.com
    pass: process.env.ADMIN_EMAIL_PASS // Gmail app password
  },
});

async function sendStudentReport({ name, email, category, description }) {
  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Report from ${name}: ${category}`,
    text: `
A new problem has been reported on Simplify.

--- Details ---

Name: ${name}
Email: ${email}
Category: ${category}

Description:
${description}

-----------------
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

  return transporter.sendMail(mailOptions);
}

module.exports = { sendStudentReport };
