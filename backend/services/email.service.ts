// backend/services/email.service.ts

import nodemailer from 'nodemailer';
import { type IUserDocument } from '../types/user.ts';

// TODO: Load SMTP configuration from environment variables
const mailerConfig = {
    service: process.env.EMAIL_SERVICE || 'gmail', // Ví dụ: 'Gmail'
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
};

const transporter = nodemailer.createTransport(mailerConfig);

/**
 * Sends the verification OTP code to the user's email.
 * @param user - The user document
 * @param otpCode - The 6-digit code
 */
export async function sendVerificationEmail(
    user: IUserDocument,
    otpCode: string
): Promise<void> {
    const mailOptions = {
        from: `VolunteerHub <${mailerConfig.auth.user}>`,
        to: user.email,
        subject: 'VolunteerHub: Email Verification Code',
        html: `
            <p>Hello ${user.username},</p>
            <p>Thank you for registering. Please use the following code to verify your account:</p>
            <h2 style="color: #007bff;">${otpCode}</h2>
            <p>This code is valid for 10 minutes.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to: ${user.email}`);
    } catch (error) {
        console.error('ERROR sending email:', error);
        // Tùy chọn: Log lỗi hoặc throw AppError
    }
}

/**
 * Sends a password reset OTP code to the user's email.
 * @param user - The user document
 * @param otpCode - The 6-digit code
 */
export async function sendResetPasswordEmail(
    user: IUserDocument,
    otpCode: string
): Promise<void> {
    const mailOptions = {
        from: `VolunteerHub <${mailerConfig.auth.user}>`,
        to: user.email,
        subject: 'VolunteerHub: Password Reset Code',
        html: `
            <p>Hello ${user.username},</p>
            <p>We received a request to reset the password for your account. Use the following verification code to reset your password:</p>
            <h2 style="color: #007bff;">${otpCode}</h2>
            <p>This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
        console.error('ERROR sending reset email:', error);
    }
}